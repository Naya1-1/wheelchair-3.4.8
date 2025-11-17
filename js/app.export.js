(function (window, document) {
  'use strict';
  var Ny = window.Ny = window.Ny || {};
  Ny.Export = Ny.Export || (function () {
    var initialized = false;

    function init() {
      if (initialized) return;
      initialized = true;
      try {
        console.debug('[Ny.Export] init');
        // 在初始化阶段即绑定“生成代码”与“复制”按钮，避免页面内联脚本被禁用后无事件处理器
        try { attachGenerateButton(); } catch (_bindGenErr) { try { console.warn('[Ny.Export] attachGenerateButton warn', _bindGenErr); } catch(_e){} }
        try { attachCopyHandlers(document); } catch (_bindCopyErr) { try { console.warn('[Ny.Export] attachCopyHandlers warn', _bindCopyErr); } catch(_e){} }
        // 自动同步：当右侧预览变化且“输出代码”弹窗已打开时，轻量刷新生成代码
        try { setupAutoSync(); } catch (_autoSyncErr) { try { console.warn('[Ny.Export] setupAutoSync warn', _autoSyncErr); } catch(_e){} }
      } catch (e) {
        console.warn('[Ny.Export] initialization warning', e);
      }
    }

    function ensure() { if (!initialized) init(); }
    // 统一错误弹窗：无回退，直接提示失败原因
    function showErrorModal(message, err) {
      try {
        var modal = document.getElementById('ny-error-modal');
        if (!modal) {
          modal = document.createElement('div');
          modal.id = 'ny-error-modal';
          modal.style.position = 'fixed';
          modal.style.inset = '0';
          modal.style.zIndex = '99999';
          modal.style.display = 'none';
          modal.innerHTML =
            '<div class="ny-error-backdrop" style="position:absolute;inset:0;background:rgba(0,0,0,.45)"></div>' +
            '<div class="ny-error-dialog" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(92vw,520px);background:#1b1c20;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.45);overflow:hidden">' +
              '<div style="padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.08);font-weight:600">生成失败</div>' +
              '<div class="ny-error-body" style="padding:16px;white-space:pre-wrap;word-break:break-word;max-height:60vh;overflow:auto"></div>' +
              '<div style="padding:12px 16px;display:flex;justify-content:flex-end;border-top:1px solid rgba(255,255,255,.08)">' +
                '<button id="ny-error-close" style="padding:6px 12px;border-radius:8px;background:#2a2d34;color:#fff;border:1px solid rgba(255,255,255,.15);cursor:pointer">关闭</button>' +
              '</div>' +
            '</div>';
          document.body.appendChild(modal);
          var close = modal.querySelector('#ny-error-close');
          var backdrop = modal.querySelector('.ny-error-backdrop');
          [close, backdrop].forEach(function(n){
            if (n && !n.__nyBound) {
              n.__nyBound = true;
              n.addEventListener('click', function(){ modal.style.display = 'none'; });
            }
          });
        }
        var body = modal.querySelector('.ny-error-body');
        var msg = String(message || '生成代码失败');
        if (err) {
          try { msg += '\n\n' + (err.message || err.stack || String(err)); } catch(_e2){}
        }
        if (body) { body.textContent = msg; }
        modal.style.display = 'block';
      } catch(_e) {
        try { alert((message || '生成代码失败') + '\n\n' + (err && (err.message || err.stack || String(err)))); } catch(_ee){}
      }
    }

    // Aliases and helpers inserted for builder implementations
    var Utils = Ny.Utils || {};
    var State = Ny.State || {};
    var Render = Ny.Render || {};

    function esc(s) {
      try { return Utils.esc ? Utils.esc(s) : String(s == null ? '' : s); }
      catch (_e) { return String(s == null ? '' : s); }
    }
    function clamp(n, min, max) {
      try { return Utils.clamp ? Utils.clamp(n, min, max) : Math.max(min, Math.min(max, n)); }
      catch (_e) { return Math.max(min, Math.min(max, n)); }
    }
    function toWrapperNameFromTitle(t) {
      try {
        return Utils.toWrapperNameFromTitle
          ? Utils.toWrapperNameFromTitle(t)
          : (String(t || '状态').replace(/[^A-Za-z0-9\u4E00-\u9FFF_-]+/g, '').trim() || '状态');
      } catch (_e) {
        return '状态';
      }
    }
    function idFromLabel(label, prefix) {
      var base = String(label || '').replace(/[^A-Za-z0-9\u4E00-\u9FFF]+/g, '');
      return (prefix || 'k_') + (base || Math.random().toString(36).slice(2, 8));
    }
    function themeBaseInline(theme) {
      try {
        if (Ny && Ny.CodeGen && typeof Ny.CodeGen.themeBaseInline === 'function') {
          return Ny.CodeGen.themeBaseInline(theme);
        }
      } catch (_e) {}
      return '';
    }
    function dividerHTMLForOutput(dividerStyle, primaryColor, dividerColor) {
      try {
        if (Ny && Ny.CodeGen && typeof Ny.CodeGen.dividerHTMLForOutput === 'function') {
          return Ny.CodeGen.dividerHTMLForOutput(dividerStyle, primaryColor, dividerColor);
        }
      } catch (_e) {}
      var dc = (dividerColor && dividerColor.trim()) ? dividerColor : primaryColor;
      if (dividerStyle === 'dashed') return '<hr style="border:none;border-top:1px dashed ' + dc + ';height:0;opacity:.9;">';
      if (dividerStyle === 'gradient') return '<hr style="border:none;height:1px;background-image:linear-gradient(to right, transparent, ' + dc + ', transparent);">';
      return '<hr style="border:none;height:1px;background:' + dc + ';">';
    }
        // Builders: delegate strictly to Ny.CodeGen（严格模式：无回退）
        function buildReplacementHTML(state, options) {
          if (!(Ny && Ny.CodeGen && typeof Ny.CodeGen.buildReplacementHTML === 'function')) {
            throw new Error('Ny.CodeGen.buildReplacementHTML 不可用');
          }
          var doc = Ny.CodeGen.buildReplacementHTML(state || State, options || {});
          if (!doc || !/\S/.test(String(doc))) throw new Error('Ny.CodeGen.buildReplacementHTML 返回空内容');
          return doc;
        }
        function buildGroupSnippet(state, options) {
          if (!(Ny && Ny.CodeGen && typeof Ny.CodeGen.buildGroupSnippet === 'function')) {
            throw new Error('Ny.CodeGen.buildGroupSnippet 不可用');
          }
          var doc = Ny.CodeGen.buildGroupSnippet(state || State, options || {});
          if (!doc || !/\S/.test(String(doc))) throw new Error('Ny.CodeGen.buildGroupSnippet 返回空内容');
          return doc;
        }
    
        // AI 输出模板：严格代理，无回退
        function buildAiTemplate(state, options) {
          if (!(Ny && Ny.CodeGen && typeof Ny.CodeGen.buildAiTemplate === 'function')) {
            throw new Error('Ny.CodeGen.buildAiTemplate 不可用');
          }
          var t = Ny.CodeGen.buildAiTemplate(state || State, options || {});
          if (!t || !/\S/.test(String(t))) throw new Error('Ny.CodeGen.buildAiTemplate 返回空内容');
          return t;
        }
    
        // findRegex：严格代理，无回退
        function buildFindRegex(state, options) {
          if (!(Ny && Ny.CodeGen && typeof Ny.CodeGen.buildFindRegex === 'function')) {
            throw new Error('Ny.CodeGen.buildFindRegex 不可用');
          }
          var r = Ny.CodeGen.buildFindRegex(state || State, options || {});
          if (!r || (typeof r === 'object' && !r.pattern)) {
            throw new Error('Ny.CodeGen.buildFindRegex 返回无效结果');
          }
          return r;
        }
    
        // 正则方案说明：严格代理，无回退
        function buildRegexReference(state, options) {
          if (!(Ny && Ny.CodeGen && typeof Ny.CodeGen.buildRegexReference === 'function')) {
            throw new Error('Ny.CodeGen.buildRegexReference 不可用');
          }
          var ref = Ny.CodeGen.buildRegexReference(state || State, options || {});
          if (ref == null) throw new Error('Ny.CodeGen.buildRegexReference 返回空内容');
          return ref;
        }

// Delegation block removed; builders above already proxy to Ny.CodeGen for clarity and reduced duplication.
    // Serialization helpers
    function serializeForExport(state) {
      try {
        var bg = (Ny.Background && Ny.Background.serializeBgConfig)
          ? Ny.Background.serializeBgConfig(state)
          : { layers: [], components: [] };
        return { state: state || {}, background: bg };
      } catch (e) {
        return { state: state || {}, background: { layers: [], components: [] } };
      }
    }

    // Module-level FX injector: unify export FX injection for HTML and static snippets
    function exportInjectFx(doc, cfg, forStatic) {
      try {
        // 按需构建 FX CSS，仅在启用相应特效时注入，避免未使用的 CSS
        var fxEnabled = !!(cfg.starEnabled || cfg.sparkleEnabled || cfg.petalEnabled);
        var fxCssParts = [];
        if (fxEnabled) {
          fxCssParts.push('.status-preview-wrapper .st-header, .status-preview-wrapper .st-body{position:relative;z-index:1;}');
          fxCssParts.push('.fx-layer{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0;}');
        }
        if (cfg.starEnabled) {
          fxCssParts.push('.fx-stars .fx-star{position:absolute;width:2px;height:2px;border-radius:50%;background:var(--star-color,#fff);box-shadow:0 0 6px var(--star-color,#fff);opacity:.8;animation:starTwinkle var(--star-speed,2s) ease-in-out infinite;}');
          fxCssParts.push('@keyframes starTwinkle{0%,100%{opacity:.3}50%{opacity:1}}');
        }
        if (cfg.sparkleEnabled) {
          fxCssParts.push('.fx-sparkles .fx-sparkle{position:absolute;width:3px;height:3px;border-radius:50%;background:var(--sparkle-color,#ffd966);box-shadow:0 0 8px rgba(255,255,200,.8);opacity:.9;animation-iteration-count:infinite;animation-timing-function:linear;}');
          fxCssParts.push('.fx-sparkles .fx-sparkle.glow{box-shadow:0 0 10px var(--sparkle-color,#ffd966),0 0 20px var(--sparkle-color,#ffd966);}');
          fxCssParts.push('@keyframes sparkleDown{0%{top:-10%;opacity:0}10%{opacity:.9}90%{opacity:.9}100%{top:110%;opacity:0}}');
          fxCssParts.push('@keyframes sparkleUp{0%{top:110%;opacity:0}10%{opacity:.9}90%{opacity:.9}100%{top:-10%;opacity:0}}');
        }
        if (cfg.petalEnabled) {
          fxCssParts.push('.fx-petals .fx-petal{position:absolute;width:18px;height:18px;opacity:.9;animation:petalFall var(--petal-speed,5s) linear infinite;}');
          fxCssParts.push('.fx-petals .fx-petal svg,.fx-petals .fx-petal img{width:100%;height:100%;filter:drop-shadow(0 0 4px rgba(0,0,0,.25));}');
          fxCssParts.push('@keyframes petalFall{0%{top:-10%;transform:translateX(0px) rotate(0deg);opacity:0}10%{opacity:1}25%{transform:translateX(-8px) rotate(90deg)}50%{transform:translateX(12px) rotate(180deg)}75%{transform:translateX(-6px) rotate(270deg)}100%{top:110%;transform:translateX(0px) rotate(360deg);opacity:0}}');
        }
        var fxCss = fxCssParts.join('\n');

        function builtinIcon(name, size, color) {
          var common = 'width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
          if (name === 'star') return '<svg ' + common + '><polygon points="12 2 15.09 8.26 22 9.27 17 13.97 18.18 21 12 17.27 5.82 21 7 13.97 2 9.27 8.91 8.26 12 2"></polygon></svg>';
          if (name === 'heart') return '<svg ' + common + '><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"></path></svg>';
          return '<svg ' + common + '><path d="M11 21C5 21 3 15 3 15S5 3 21 3c0 16-12 18-12 18z"/></svg>';
        }

        var cfgJson = {
          starEnabled: !!cfg.starEnabled,
          starFrequency: Number(cfg.starFrequency || 2),
          starDensity: Number(cfg.starDensity || 0),
          starColor: String(cfg.starColor || '#ffffff'),
          sparkleEnabled: !!cfg.sparkleEnabled,
          sparkleDirection: String(cfg.sparkleDirection || 'down'),
          sparkleFrequency: Number(cfg.sparkleFrequency || 8),
          sparkleDensity: Number(cfg.sparkleDensity || 20),
          sparkleColor: String(cfg.sparkleColor || '#ffd966'),
          sparkleGlow: !!cfg.sparkleGlow,
          petalEnabled: !!cfg.petalEnabled,
          petalFrequency: Number(cfg.petalFrequency || 5),
          petalDensity: Number(cfg.petalDensity || 20),
          petalIconMode: String(cfg.petalIconMode || 'built-in'),
          petalIconBuiltin: String(cfg.petalIconBuiltin || 'leaf'),
          petalIconUrl: String(cfg.petalIconUrl || ''),
          secondaryColor: String((State.customization && State.customization.secondaryColor) || '#ffffff')
        };

        var fxJs = [
          '(function(){',
          '  var cfg = ' + JSON.stringify(cfgJson) + ';',
          '  function getBuiltinIconSVG(name,size,color){',
          '    var common = \'width="\'+size+\'" height="\'+size+\'" viewBox="0 0 24 24" fill="none" stroke="\'+color+\'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"\';',
          '    if(name===\'star\') return \'<svg \'+common+\'><polygon points="12 2 15.09 8.26 22 9.27 17 13.97 18.18 21 12 17.27 5.82 21 7 13.97 2 9.27 8.91 8.26 12 2"></polygon></svg>\';',
          '    if(name===\'heart\') return \'<svg \'+common+\'><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"></path></svg>\';',
          '    return \'<svg \'+common+\'><path d="M11 21C5 21 3 15 3 15S5 3 21 3c0 16-12 18-12 18z"/></svg>\';',
          '  }',
          '  function renderFxLayersExport(wrapper){',
          '    try{',
          '      if(!wrapper) return;',
          '      Array.prototype.slice.call(wrapper.querySelectorAll(\'.fx-layer\')).forEach(function(n){ if(n && n.parentNode){ n.parentNode.removeChild(n); } });',
          '      if(cfg.starEnabled){',
          '        var layer=document.createElement(\'div\'); layer.className=\'fx-layer fx-stars\';',
          '        layer.style.setProperty(\'--star-color\', cfg.starColor || \'#ffffff\');',
          '        layer.style.setProperty(\'--star-speed\', (cfg.starFrequency || 2) + \'s\');',
          '        var count=Math.max(0,Math.min(1000,parseInt(cfg.starDensity||0,10)||0));',
          '        for(var i=0;i<count;i++){',
          '          var e=document.createElement(\'span\'); e.className=\'fx-star\';',
          '          var size=1+Math.random()*1.5; var x=Math.random()*100; var y=Math.random()*100;',
          '          e.style.width=size+\'px\'; e.style.height=size+\'px\'; e.style.left=x+\'%\'; e.style.top=y+\'%\';',
          '          e.style.animationDelay=(Math.random()*(cfg.starFrequency||2))+\'s\';',
          '          layer.appendChild(e);',
          '        }',
          '        wrapper.appendChild(layer);',
          '      }',
          '      if(cfg.sparkleEnabled){',
          '        var layer2=document.createElement(\'div\'); layer2.className=\'fx-layer fx-sparkles\';',
          '        layer2.style.setProperty(\'--sparkle-color\', cfg.sparkleColor || \'#ffd966\');',
          '        var speed=cfg.sparkleFrequency || 2; var dir=(cfg.sparkleDirection===\'up\')?\'up\':\'down\';',
          '        var cnt=Math.max(0,Math.min(1000,parseInt(cfg.sparkleDensity||0,10)||0));',
          '        for(var j=0;j<cnt;j++){',
          '          var s=document.createElement(\'span\'); s.className=\'fx-sparkle\'+(cfg.sparkleGlow?\' glow\':\'\');',
          '          var size2=2+Math.random()*1.5; var x2=Math.random()*100; var delay2=Math.random()*speed;',
          '          s.style.width=size2+\'px\'; s.style.height=size2+\'px\'; s.style.left=x2+\'%\';',
          '          s.style.top=(dir===\'down\'?\'-5%\':\'105%\'); s.style.animationDuration=speed+\'s\';',
          '          s.style.animationName=(dir===\'down\'?\'sparkleDown\':\'sparkleUp\');',
          '          s.style.animationDelay=delay2+\'s\'; s.style.animationIterationCount=\'infinite\'; s.style.animationTimingFunction=\'linear\';',
          '          layer2.appendChild(s);',
          '        }',
          '        wrapper.appendChild(layer2);',
          '      }',
          '      if(cfg.petalEnabled){',
          '        var layer3=document.createElement(\'div\'); layer3.className=\'fx-layer fx-petals\';',
          '        var speed3=cfg.petalFrequency || 5; var cnt3=Math.max(0,Math.min(1000,parseInt(cfg.petalDensity||0,10)||0));',
          '        for(var k=0;k<cnt3;k++){',
          '          var p=document.createElement(\'span\'); p.className=\'fx-petal\';',
          '          var x3=Math.random()*100; var delay3=Math.random()*speed3; var rot=-30+Math.random()*60;',
          '          p.style.left=x3+\'%\'; p.style.top=\'-10%\'; p.style.animationDuration=speed3+\'s\'; p.style.animationDelay=delay3+\'s\'; p.style.transform=\'rotate(\'+rot+\'deg)\';',
          '          if(cfg.petalIconMode===\'url\' && cfg.petalIconUrl){',
          '            var img=document.createElement(\'img\'); img.src=cfg.petalIconUrl; img.alt=\'\'; p.appendChild(img);',
          '          } else {',
          '            var svg=getBuiltinIconSVG(cfg.petalIconBuiltin||\'leaf\', 18, (cfg.secondaryColor || \'#ffffff\')); p.innerHTML=svg;',
          '          }',
          '          layer3.appendChild(p);',
          '        }',
          '        wrapper.appendChild(layer3);',
          '      }',
          '    }catch(err){ try{console.warn(\'[export fx] render error\', err);}catch(_e){} }',
          '  }',
          '  renderFxLayersExport(document.getElementById(\'ny-status\'));',
          '})();'
        ].join('\n');

        var out = String(doc);
        if (fxCss && /\S/.test(fxCss)) {
          out = out.replace('</style>', fxCss + '</style>');
        }
        if (cfg && (cfg.starEnabled || cfg.sparkleEnabled || cfg.petalEnabled)) {
          if (forStatic) {
            out = out.replace('</body>', '<script>' + fxJs.replace('</script>', '<' + '/script>') + '</script>\n</body>');
          } else {
            out = out.replace('</script>', fxJs + '</script>');
          }
        }
        return out;
      } catch (_e) { throw _e; }
    }

    // embeddedNyCoreCss 已删除（禁止任何“回退”策略）
    // 由于用户要求“生成代码中严禁外链，且仅内联使用到的 CSS 片段”，
    // 当运行环境无法通过 fetch 进行内联（例如 file:// 或离线）时，
    // 我们提供一个极简离线内联样式作为兜底，确保页面不至于完全失去样式。
    function injectInlineStyle(doc, css) {
      try {
        var s = String(doc || '');
        var safeCss = String(css || '').replace(/<\/style>/gi, '</s' + 'tyle>');
        var tag = '<style>' + safeCss + '</style>';
        if (s.indexOf('</head>') !== -1) return s.replace('</head>', tag + '</head>');
        return tag + s;
      } catch (_e) {
        return String(doc || '');
      }
    }
    function minimalOfflineCss() {
          // 加强版离线样式：补齐进度条动效/样式、多图层背景、常用动画与百分比位置
          return [
            /* 基础布局 */
            '.status-preview-wrapper{position:relative;box-sizing:border-box;}',
            '.status-preview-wrapper *{box-sizing:border-box;}',
            '.status-preview-wrapper .st-header{display:flex;align-items:center;gap:.6em;margin-bottom:.6em;}',
            '.status-preview-wrapper .st-body{position:relative;z-index:1;display:block;}',
            '.status-preview-wrapper .st-item{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:.4em 0;}',
            /* 🔧 整体偏移支持：应用CSS变量来控制项目的左右偏移 */
            '.status-preview-wrapper .st-item{margin-left:calc(1% * var(--item-offset-pct, 0));margin-right:calc(1% * var(--item-offset-right-pct, 0));}',
            '.status-preview-wrapper .st-label{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.status-preview-wrapper .st-value{min-width:120px;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.status-preview-wrapper .st-value.st-text{white-space:normal;word-break:break-word;overflow-wrap:anywhere;text-overflow:clip;}',
    
            /* 进度条基础与百分比 */
            '.status-preview-wrapper .st-progress-bar{position:relative;width:100%;height:10px;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden;}',
            '.status-preview-wrapper .st-progress-bar .st-progress-bar-fill{position:relative;height:100%;width:var(--target,50%);background:var(--bar-color, #85a6f8);border-radius:inherit;z-index:1;} ',
            '.status-preview-wrapper .st-progress-percent{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:2px 8px;border-radius:999px;background:rgba(0,0,0,.35);color:#fff;font-size:12px;pointer-events:none;opacity:0;transition:opacity .3s;z-index:2;}',
            '.status-preview-wrapper .st-progress-bar.show-percent .st-progress-percent{opacity:1;}',
    
            /* 进度条样式与动画（class 驱动） */
            '.status-preview-wrapper .st-progress-bar .st-progress-bar-fill.pf-anim-grow{transition:width .6s ease;}',
            '.status-preview-wrapper .st-progress-bar .st-progress-bar-fill.pf-glow{box-shadow:0 0 10px var(--bar-color,#85a6f8),0 0 18px color-mix(in srgb, var(--bar-color,#85a6f8) 60%, transparent);} ',
            '.status-preview-wrapper .st-progress-bar .st-progress-bar-fill.pf-glass{filter:saturate(1.1) contrast(1.05) brightness(1.1);box-shadow:inset 0 0 10px rgba(255,255,255,.18), inset 0 -8px 16px rgba(0,0,0,.12);} ',
            /* 条纹采用 mask 叠加，不覆盖内联 background */
            '.status-preview-wrapper .st-progress-bar .st-progress-bar-fill.pf-striped{mask-image:repeating-linear-gradient(45deg, rgba(0,0,0,.85) 0 12px, rgba(0,0,0,.35) 12px 24px);-webkit-mask-image:repeating-linear-gradient(45deg, rgba(0,0,0,.85) 0 12px, rgba(0,0,0,.35) 12px 24px);mask-size:24px 24px;-webkit-mask-size:24px 24px;animation:stripePan 8s linear infinite;}',
            '@keyframes stripePan{0%{mask-position:0 0;-webkit-mask-position:0 0}100%{mask-position:48px 0;-webkit-mask-position:48px 0}}',
    
            /* 百分比位置风格（与预览一致：center/badge/tooltip/follow/toast/left/right） */
            '.percent-style-center .st-progress-bar .st-progress-percent{left:50%;top:50%;transform:translate(-50%,-50%);padding:2px 8px;border-radius:999px;background:rgba(0,0,0,.35);backdrop-filter:blur(2px);box-shadow:0 2px 8px rgba(0,0,0,.35);}',
            '.percent-style-badge .st-progress-bar .st-progress-percent{right:-6px;top:-12px;transform:translate(0,0);padding:2px 8px;border-radius:999px;background:color-mix(in srgb, var(--bar-color) 40%, #000 60%);box-shadow:0 4px 12px rgba(0,0,0,.35);}',
            '.percent-style-badge .st-progress-bar .st-progress-percent::after{content:"";position:absolute;bottom:-4px;right:10px;width:8px;height:8px;background:currentColor;opacity:.35;transform:rotate(45deg);}',
            '.percent-style-tooltip .st-progress-bar .st-progress-percent{left:var(--pct,0%);bottom:calc(100% + 6px);transform:translateX(-50%);padding:4px 10px;border-radius:8px;background:color-mix(in srgb, var(--bar-color) 26%, #000 74%);box-shadow:0 6px 14px rgba(0,0,0,.35);}',
            '.percent-style-tooltip .st-progress-bar .st-progress-percent::after{content:"";position:absolute;top:100%;left:50%;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:6px solid color-mix(in srgb, var(--bar-color) 26%, #000 74%);}',
            '.percent-style-follow .st-progress-bar .st-progress-percent{left:var(--pct,0%);top:50%;transform:translate(-50%,-50%);padding:2px 8px;border-radius:999px;background:color-mix(in srgb, var(--bar-color) 30%, #000 70%);box-shadow:0 2px 8px rgba(0,0,0,.35);}',
            '.percent-style-toast .st-progress-bar .st-progress-percent{left:50%;top:calc(100% + 8px);transform:translateX(-50%);padding:4px 10px;border-radius:10px;background:rgba(0,0,0,.55);box-shadow:0 10px 18px rgba(0,0,0,.35);}',
            '.percent-style-left .st-progress-bar .st-progress-percent{left:8%;top:50%;transform:translate(0,-50%);}',
            '.percent-style-right .st-progress-bar .st-progress-percent{left:auto;right:8%;top:50%;transform:translate(0,-50%);}',
            '/* 溢出显示支持：允许百分比突破条容器与值容器 */',
            '.percent-style-badge .st-progress-bar,.percent-style-tooltip .st-progress-bar,.percent-style-toast .st-progress-bar,.percent-style-center .st-progress-bar,.percent-style-follow .st-progress-bar{overflow:visible;}',
            '.percent-style-badge .st-value,.percent-style-tooltip .st-value,.percent-style-toast .st-value,.percent-style-center .st-value,.percent-style-follow .st-value{overflow:visible;}',
    
            /* 背景多层 */
            '.status-preview-wrapper .bg-layers{position:absolute;inset:0;z-index:0;pointer-events:none;border-radius:inherit;overflow:hidden;}',
            '.status-preview-wrapper .bg-layer{position:absolute;inset:0;background-position:center;background-size:cover;background-repeat:no-repeat;}',
            '.status-preview-wrapper .bg-components-layer{position:absolute;inset:0;z-index:2;pointer-events:none;}',
            '.status-preview-wrapper .bg-comp{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:auto;user-select:none;-webkit-user-drag:none;}',
    
            /* 常用进入与循环动画（作用于 wrapper） */
            '.anim-fade-in{animation:fadeIn var(--anim-speed,1s) ease-out both;}',
            '@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}',
    
            '.anim-slide-up{animation:slideUp var(--anim-speed,1s) ease-out both;}',
            '@keyframes slideUp{from{opacity:.0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}',
    
            '.anim-pulse{animation:pulse calc(var(--anim-speed,1s)*1.2) ease-in-out infinite;}',
            '@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.02)}}',
    
            '.anim-neon-glow{animation:neonGlow calc(var(--anim-speed,1s)*3) ease-in-out infinite;}',
            '@keyframes neonGlow{0%,100%{box-shadow:0 0 12px var(--glow-color-a,#85a6f8), inset 0 0 12px var(--glow-color-b,#95b3e8)}50%{box-shadow:0 0 18px var(--glow-color-b,#95b3e8), inset 0 0 18px var(--glow-color-a,#85a6f8)}}',
    
            '.anim-shimmer{position:relative;overflow:hidden;}',
            '.anim-shimmer::after{content:"";position:absolute;inset:-20%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent);transform:translateX(-100%);animation:shimmerShift calc(var(--anim-speed,1s)*2) linear infinite;}',
            '@keyframes shimmerShift{to{transform:translateX(100%)}}',
    
            '.anim-tilt-3d{animation:tilt3d calc(var(--anim-speed,1s)*4) ease-in-out infinite;}',
            '@keyframes tilt3d{0%,100%{transform:perspective(600px) rotateX(0) rotateY(0)}50%{transform:perspective(600px) rotateX(2deg) rotateY(-2deg)}}',
    
            '.anim-breathe{animation:breathe calc(var(--anim-speed,1s)*3) ease-in-out infinite;}',
            '@keyframes breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.01)}}',
    
            '.anim-gloss{position:relative;overflow:hidden;}',
            '.anim-gloss::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,0) 60%);opacity:.4;animation:glossSweep calc(var(--anim-speed,1s)*6) ease-in-out infinite;}',
            '@keyframes glossSweep{0%,100%{opacity:.25}50%{opacity:.5}}',
    
            /* ====== Responsive layout subset (≤768px & ≤375px) ====== */
            '@media (max-width: 768px) {',
            '  .status-preview-wrapper:not(.ratio-layout) .st-item{flex-direction:column;align-items:flex-start;gap:6px;}',
            '  .status-preview-wrapper .st-label,.status-preview-wrapper .st-value{white-space:normal;word-break:break-word;overflow-wrap:anywhere;text-overflow:clip;overflow:visible;text-align:left;}',
            '  .status-preview-wrapper .st-value{width:100%;max-width:100%;transform:none;}',
            '  .status-preview-wrapper.layout-two-column .st-body{grid-template-columns:1fr;}',
            '  .status-preview-wrapper.ratio-layout .st-item:not(:has(.st-longtext)){display:grid;grid-template-columns:var(--lv-label,30%) var(--lv-value,70%);column-gap:12px;align-items:center;}',
            '  .status-preview-wrapper.ratio-layout .st-item .st-value.st-longtext{grid-column:1 / -1;width:100%;max-width:100%;transform:none;}',
            '}',
            '@media (max-width: 375px) {',
            '  .status-preview-wrapper .st-item{gap:4px;}',
            '  .status-preview-wrapper .st-progress-percent{font-size:12px;padding:2px 6px;}',
            '}'
          ].join('') + "\n/* collapsed region fold rules */\n.st-region.collapsed > .st-region-body{display:none !important;margin:0 !important;padding:0 !important;}\n.st-region.collapsed{margin-bottom:0 !important;}\n.st-region.collapsed .st-region-header{margin-bottom:0 !important;}";
        }

    // Background layers essentials subset for exports (idempotent guard)
    // Export-only helper: Region header "glass" subset to avoid embedding full ny-ui.css
    // Covers: .st-region-header base + .hdr-mode-glass (dark/light)
    function regionHeaderGlassCss() {
      try {
        return [
          '/* ====== Export: region header glass subset ====== */',
          '.st-region-header{transition:background 0.18s ease-out,border-color 0.18s ease-out,border-width 0.18s ease-out,padding 0.18s ease-out,box-shadow 0.18s ease-out,border-radius 0.18s ease-out;position:relative;will-change:background,border-color,border-width,padding,box-shadow,border-radius;background-clip:padding-box;}',
          '.st-region-header.hdr-mode-glass{background:linear-gradient(180deg, color-mix(in srgb, #ffffff 7%, transparent), color-mix(in srgb, #ffffff 2%, transparent)) !important;border:1px solid color-mix(in srgb, var(--border-color) 65%, transparent);box-shadow:0 2px 10px rgba(0,0,0,.20), inset 0 1px 0 rgba(255,255,255,.06);backdrop-filter:blur(8px) saturate(1.1);-webkit-backdrop-filter:blur(8px) saturate(1.1);} ',
          '.st-region-header.hdr-mode-glass:hover{box-shadow:0 4px 14px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.08);border-color:color-mix(in srgb, var(--accent-primary) 28%, var(--border-color));}',
          'body.ui-light .st-region-header.hdr-mode-glass{background:linear-gradient(180deg, color-mix(in srgb, #ffffff 25%, transparent), color-mix(in srgb, #ffffff 10%, transparent)) !important;border:1px solid color-mix(in srgb, var(--border-color) 80%, transparent);box-shadow:0 2px 8px rgba(0,0,0,.08), inset 0 1px 0 rgba(255,255,255,.35);backdrop-filter:blur(6px) saturate(1.05);-webkit-backdrop-filter:blur(6px) saturate(1.05);} '
        ].join('\n');
      } catch(_e){ return ''; }
    }
    function bgLayersSubsetCss() {
          try {
            return [
              '/* essentials: background layers subset */',
              '.status-preview-wrapper .bg-layers{position:absolute;inset:0;z-index:0;pointer-events:none;border-radius:inherit;overflow:hidden;}',
              '.status-preview-wrapper .bg-layer{position:absolute;inset:0;background-position:center;background-size:cover;background-repeat:no-repeat;}',
              '.status-preview-wrapper .bg-components-layer{position:absolute;inset:0;z-index:2;pointer-events:none;}',
              '.status-preview-wrapper .bg-comp{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:auto;user-select:none;-webkit-user-drag:none;}'
            ].join('\n');
          } catch(_e) {
            return '.status-preview-wrapper .bg-layers{position:absolute;inset:0;z-index:0;pointer-events:none;border-radius:inherit;overflow:hidden;}.status-preview-wrapper .bg-layer{position:absolute;inset:0;background-position:center;background-size:cover;background-repeat:no-repeat;}.status-preview-wrapper .bg-components-layer{position:absolute;inset:0;z-index:2;pointer-events:none;}.status-preview-wrapper .bg-comp{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:auto;user-select:none;-webkit-user-drag:none;}';
          }
        }
        function responsiveLayoutCss() {
          try {
            return [
              '/* ====== Export: responsive layout subset (≤768px & ≤375px) ====== */',
              '@media (max-width: 768px) {',
              '  .status-preview-wrapper:not(.ratio-layout) .st-item{flex-direction:column;align-items:flex-start;gap:6px;}',
              '  .status-preview-wrapper .st-label,.status-preview-wrapper .st-value{white-space:normal;word-break:break-word;overflow-wrap:anywhere;text-overflow:clip;overflow:visible;text-align:left;}',
              '  .status-preview-wrapper .st-value{width:100%;max-width:100%;transform:none;}',
              '  .status-preview-wrapper.layout-two-column .st-body{grid-template-columns:1fr;}',
              '  .status-preview-wrapper.ratio-layout .st-item:not(:has(.st-longtext)){display:grid;grid-template-columns:var(--lv-label,30%) var(--lv-value,70%);column-gap:12px;align-items:center;}',
              '  .status-preview-wrapper.ratio-layout .st-item .st-value.st-longtext{grid-column:1 / -1;width:100%;max-width:100%;transform:none;}',
              '}',
              '@media (max-width: 375px) {',
              '  .status-preview-wrapper .st-item{gap:4px;}',
              '  .status-preview-wrapper .st-progress-percent{font-size:12px;padding:2px 6px;}',
              '}'
            ].join('\n');
          } catch(_e){ return ''; }
        }

    // ======= Embedded CSS bundle fallback (no fetch, no CSSOM) =======
    function __stripImports(css) {
      try { return String(css || '').replace(/@import[^;]+;[ \t]*/g, ''); } catch (_e) { return String(css || ''); }
    }
    function embeddedUiCss() {
      // 注意：ny-ui.css 很大，这里仅在嵌入式兜底中按需剥离 @import 后提供
      // 为避免 file:// 环境下再次产生外链请求，@import 会在注入前被 __stripImports 去除
      return `/* ny-ui.css (embedded snapshot) */
${`@import url('./ny-ui-fonts.css');
@import url('./ny-themes.css');
@import url('./ny-ui-effects.css');`}
// 以下为实际 UI 样式主体（已从项目文件快照拷贝）
${(() => {
  // 为了控制体积与避免重复，这里不直接内嵌完整 UI 样式；
  // 实际使用中，嵌入式兜底主要依赖“主题 CSS + 效果 CSS + 生成器已写入的内联样式”。
  // 如果发现仍有缺失，可将 ny-ui.css 全量文本替换到此处。
  return `/* UI 基础由生成器内联 + 主题覆盖，必要时将 ny-ui.css 全量嵌入到此函数 */`;
})()}
`;
    }
    function embeddedEffectsCss() {
      return `/* ny-ui-effects.css (embedded, extended) */
  .status-preview-wrapper .st-header, .status-preview-wrapper .st-body { position: relative; z-index: 1; }
  .status-preview-wrapper, .status-preview-wrapper * { box-sizing: border-box; }
  .status-preview-wrapper .st-header { display: flex; align-items: center; gap: .6em; }
  
  /* 整体偏移支持：CSS 变量驱动左右边距（导出必需） */
  .status-preview-wrapper .st-item { margin-left: calc(1% * var(--item-offset-pct, 0)); margin-right: calc(1% * var(--item-offset-right-pct, 0)); }

  /* FX 层基础与动画 */
 .fx-layer { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 0; }
 .fx-stars .fx-star { position: absolute; width: 2px; height: 2px; border-radius: 50%; background: var(--star-color, #ffffff); box-shadow: 0 0 6px var(--star-color, #ffffff); opacity: .8; animation: starTwinkle var(--star-speed, 2s) ease-in-out infinite; }
 @keyframes starTwinkle { 0%,100% { opacity:.3 } 50% { opacity:1 } }
 .fx-sparkles .fx-sparkle { position: absolute; width: 3px; height: 3px; border-radius: 50%; background: var(--sparkle-color, #ffd966); box-shadow: 0 0 8px rgba(255,255,200,.8); opacity: .9; animation-iteration-count: infinite; animation-timing-function: linear; }
 .fx-sparkles .fx-sparkle.glow { box-shadow: 0 0 10px var(--sparkle-color, #ffd966), 0 0 20px var(--sparkle-color, #ffd966); }
 @keyframes sparkleDown { 0% { top: -10%; opacity:0 } 10% { opacity:.9 } 90% { opacity:.9 } 100% { top: 110%; opacity:0 } }
 @keyframes sparkleUp { 0% { top: 110%; opacity:0 } 10% { opacity:.9 } 90% { opacity:.9 } 100% { top: -10%; opacity:0 } }
 .fx-petals .fx-petal { position: absolute; width: 18px; height: 18px; opacity: .9; animation: petalFall var(--petal-speed, 5s) linear infinite; }
 .fx-petals .fx-petal svg, .fx-petals .fx-petal img { width: 100%; height: 100%; filter: drop-shadow(0 0 4px rgba(0,0,0,.25)); }
 @keyframes petalFall { 0% { top:-10%; transform: translateX(0px) rotate(0deg); opacity:0 } 10% { opacity:1 } 25% { transform: translateX(-8px) rotate(90deg) } 50% { transform: translateX(12px) rotate(180deg) } 75% { transform: translateX(-6px) rotate(270deg) } 100% { top:110%; transform: translateX(0px) rotate(360deg); opacity:0 } }

 /* 进度条补全：动画与风格（不覆盖内联 background） */
 .status-preview-wrapper .st-progress-bar .st-progress-bar-fill.pf-anim-grow{transition:width .6s ease;}
 .status-preview-wrapper .st-progress-bar .st-progress-bar-fill.pf-glow{box-shadow:0 0 10px var(--bar-color,#85a6f8),0 0 18px color-mix(in srgb, var(--bar-color,#85a6f8) 60%, transparent);}
 .status-preview-wrapper .st-progress-bar .st-progress-bar-fill.pf-glass{filter:saturate(1.1) contrast(1.05) brightness(1.1);box-shadow:inset 0 0 10px rgba(255,255,255,.18), inset 0 -8px 16px rgba(0,0,0,.12);}
 .status-preview-wrapper .st-progress-bar .st-progress-bar-fill.pf-striped{mask-image:repeating-linear-gradient(45deg, rgba(0,0,0,.85) 0 12px, rgba(0,0,0,.35) 12px 24px);-webkit-mask-image:repeating-linear-gradient(45deg, rgba(0,0,0,.85) 0 12px, rgba(0,0,0,.35) 12px 24px);mask-size:24px 24px;-webkit-mask-size:24px 24px;animation:stripePan 8s linear infinite;}
 @keyframes stripePan{0%{mask-position:0 0;-webkit-mask-position:0 0}100%{mask-position:48px 0;-webkit-mask-position:48px 0}}
 .status-preview-wrapper .st-progress-bar .st-progress-percent{position:absolute;pointer-events:none;transition:opacity .3s;opacity:0;z-index:2;}
 .status-preview-wrapper .st-progress-bar.show-percent .st-progress-percent{opacity:1;}
 /* 层级与圆角继承，确保与预览一致且无偏移 */
 .status-preview-wrapper .st-progress-bar .st-progress-bar-fill{position:relative;z-index:1;border-radius:inherit;height:100%;}
 .status-preview-wrapper .st-progress-bar{border-radius:999px;overflow:hidden;}

 /* 百分比位置风格（与预览一致） */
 .status-preview-wrapper .st-progress-bar{position:relative;}
 .percent-style-center .st-progress-bar .st-progress-percent{
   left:50%; top:50%; transform:translate(-50%,-50%);
   padding:2px 8px; border-radius:999px; background:rgba(0,0,0,.35);
   backdrop-filter:blur(2px); box-shadow:0 2px 8px rgba(0,0,0,.35);
 }
 .percent-style-badge .st-progress-bar .st-progress-percent{
   right:-6px; top:-12px; transform:translate(0,0);
   padding:2px 8px; border-radius:999px;
   background:color-mix(in srgb, var(--bar-color) 40%, #000 60%);
   box-shadow:0 4px 12px rgba(0,0,0,.35);
 }
 .percent-style-badge .st-progress-bar .st-progress-percent::after{
   content:'';
   position:absolute; bottom:-4px; right:10px; width:8px; height:8px;
   background:currentColor; opacity:.35; transform:rotate(45deg);
 }
 .percent-style-tooltip .st-progress-bar .st-progress-percent{
   left:var(--pct,0%); bottom:calc(100% + 6px); transform:translateX(-50%);
   padding:4px 10px; border-radius:8px;
   background:color-mix(in srgb, var(--bar-color) 26%, #000 74%);
   box-shadow:0 6px 14px rgba(0,0,0,.35);
 }
 .percent-style-tooltip .st-progress-bar .st-progress-percent::after{
   content:'';
   position:absolute; top:100%; left:50%; transform:translateX(-50%);
   width:0; height:0;
   border-left:6px solid transparent; border-right:6px solid transparent;
   border-top:6px solid color-mix(in srgb, var(--bar-color) 26%, #000 74%);
 }
 .percent-style-follow .st-progress-bar .st-progress-percent{
   left:var(--pct,0%); top:50%; transform:translate(-50%,-50%);
   padding:2px 8px; border-radius:999px;
   background:color-mix(in srgb, var(--bar-color) 30%, #000 70%);
   box-shadow:0 2px 8px rgba(0,0,0,.35);
 }
 .percent-style-toast .st-progress-bar .st-progress-percent{
   left:50%; top:calc(100% + 8px); transform:translateX(-50%);
   padding:4px 10px; border-radius:10px; background:rgba(0,0,0,.55);
   box-shadow:0 10px 18px rgba(0,0,0,.35);
 }
 .percent-style-left .st-progress-bar .st-progress-percent{left:8%; top:50%; transform:translate(0,-50%);}
 .percent-style-right .st-progress-bar .st-progress-percent{left:auto; right:8%; top:50%; transform:translate(0,-50%);}
 /* 溢出显示支持 */
 .percent-style-badge .st-progress-bar,
 .percent-style-tooltip .st-progress-bar,
 .percent-style-toast .st-progress-bar,
 .percent-style-center .st-progress-bar,
 .percent-style-follow .st-progress-bar{ overflow:visible; }
 .percent-style-badge .st-value,
 .percent-style-tooltip .st-value,
 .percent-style-toast .st-value,
 .percent-style-center .st-value,
 .percent-style-follow .st-value{ overflow:visible; }

 /* 常用动画类（与预览保持一致变量名） */
 .anim-fade-in{animation:fadeIn var(--anim-speed,1s) ease-out both;}
 @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}

 .anim-slide-up{animation:slideUp var(--anim-speed,1s) ease-out both;}
 @keyframes slideUp{from{opacity:.0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}

 .anim-pulse{animation:pulse calc(var(--anim-speed,1s)*1.2) ease-in-out infinite;}
 @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.02)}}

 .anim-neon-glow{animation:neonGlow calc(var(--anim-speed,1s)*3) ease-in-out infinite;}
 @keyframes neonGlow{0%,100%{box-shadow:0 0 12px var(--glow-color-a,#85a6f8), inset 0 0 12px var(--glow-color-b,#95b3e8)}50%{box-shadow:0 0 18px var(--glow-color-b,#95b3e8), inset 0 0 18px var(--glow-color-a,#85a6f8)}}

 .anim-shimmer{position:relative;overflow:hidden;}
 .anim-shimmer::after{content:"";position:absolute;inset:-20%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent);transform:translateX(-100%);animation:shimmerShift calc(var(--anim-speed,1s)*2) linear infinite;}
 @keyframes shimmerShift{to{transform:translateX(100%)}}

 .anim-tilt-3d{animation:tilt3d calc(var(--anim-speed,1s)*4) ease-in-out infinite;}
 @keyframes tilt3d{0%,100%{transform:perspective(600px) rotateX(0) rotateY(0)}50%{transform:perspective(600px) rotateX(2deg) rotateY(-2deg)}}

 .anim-breathe{animation:breathe calc(var(--anim-speed,1s)*3) ease-in-out infinite;}
 @keyframes breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.01)}}

 .anim-gloss{position:relative;overflow:hidden;}
 .anim-gloss::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,0) 60%);opacity:.4;animation:glossSweep calc(var(--anim-speed,1s)*6) ease-in-out infinite;}
 @keyframes glossSweep{0%,100%{opacity:.25}50%{opacity:.5}}

 /* ====== Region header/body loop effects (generic) ====== */
 .region-loop-gloss{position:relative;overflow:hidden;}
 .region-loop-gloss::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,0) 60%);opacity:.4;animation:glossSweep calc(var(--anim-speed,1s)*6) ease-in-out infinite;}
 .region-loop-shimmer{position:relative;overflow:hidden;}
 .region-loop-shimmer::after{content:"";position:absolute;inset:-20%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent);transform:translateX(-100%);animation:shimmerShift calc(var(--anim-speed,1s)*2) linear infinite;}
 .region-loop-breathe{animation:breathe calc(var(--anim-speed,1s)*3) ease-in-out infinite;}
 .region-loop-neon{animation:neonGlow calc(var(--anim-speed,1s)*3) ease-in-out infinite;}

 /* ====== Region body enter/exit animations ====== */
 .region-body-anim{will-change:transform,opacity;}
 .body-enter-fade{animation:rbFadeIn var(--rb-dur,.6s) var(--rb-ease,ease) both;}
 .body-exit-fade{animation:rbFadeOut var(--rb-dur,.6s) var(--rb-ease,ease) both;}
 .body-enter-slide-down{animation:rbSlideDownIn var(--rb-dur,.6s) var(--rb-ease,ease) both;}
 .body-exit-slide-down{animation:rbSlideDownOut var(--rb-dur,.6s) var(--rb-ease,ease) both;}
 .body-enter-slide-up{animation:rbSlideUpIn var(--rb-dur,.6s) var(--rb-ease,ease) both;}
 .body-exit-slide-up{animation:rbSlideUpOut var(--rb-dur,.6s) var(--rb-ease,ease) both;}
 .body-enter-zoom-in{animation:rbZoomIn var(--rb-dur,.6s) var(--rb-ease,ease) both;}
 .body-exit-zoom-in{animation:rbZoomOut var(--rb-dur,.6s) var(--rb-ease,ease) both;}
 .body-enter-zoom-out{animation:rbZoomOutIn var(--rb-dur,.6s) var(--rb-ease,ease) both;}
 .body-exit-zoom-out{animation:rbZoomInOut var(--rb-dur,.6s) var(--rb-ease,ease) both;}

 /* ====== Region header expand/collapse animations (export subset) ====== */
 /* Flip3D */
 .region-expand-flip3d{animation:hdrFlip3dIn var(--exp-dur,.8s) ease both;will-change:transform,opacity;}
 .region-collapse-flip3d{animation:hdrFlip3dOut var(--exp-dur,.8s) ease both;will-change:transform,opacity;}
 @keyframes hdrFlip3dIn{from{opacity:0;transform:perspective(600px) rotateX(-12deg) translateY(-4px)}to{opacity:1;transform:perspective(600px) rotateX(0) translateY(0)}}
 @keyframes hdrFlip3dOut{from{opacity:1;transform:perspective(600px) rotateX(0) translateY(0)}to{opacity:0;transform:perspective(600px) rotateX(12deg) translateY(-4px)}}

 /* Wipe (reveal from left to right) */
 .region-expand-wipe{animation:hdrWipeIn var(--exp-dur,.8s) ease both;overflow:hidden;}
 .region-collapse-wipe{animation:hdrWipeOut var(--exp-dur,.8s) ease both;overflow:hidden;}
 @keyframes hdrWipeIn{from{opacity:0;clip-path:inset(0 100% 0 0)}to{opacity:1;clip-path:inset(0 0 0 0)}}
 @keyframes hdrWipeOut{from{opacity:1;clip-path:inset(0 0 0 0)}to{opacity:0;clip-path:inset(0 100% 0 0)}}

 /* Pop (scale with intensity) */
 .region-expand-pop{animation:hdrPopIn var(--exp-dur,.8s) ease both;will-change:transform,opacity;}
 .region-collapse-pop{animation:hdrPopOut var(--exp-dur,.8s) ease both;will-change:transform,opacity;}
 @keyframes hdrPopIn{from{opacity:.0;transform:scale(calc(1 - .06 * var(--exp-int,.5)))}to{opacity:1;transform:scale(1)}}
 @keyframes hdrPopOut{from{opacity:1;transform:scale(1)}to{opacity:.0;transform:scale(calc(1 - .06 * var(--exp-int,.5)))}}

 /* Underline sweep (line draws under header) */
 .region-expand-underline{animation:hdrUnderlineIn var(--exp-dur,.8s) ease both;position:relative;}
 .region-collapse-underline{animation:hdrUnderlineOut var(--exp-dur,.8s) ease both;position:relative;}
 @keyframes hdrUnderlineIn{from{opacity:.0}to{opacity:1}}
 @keyframes hdrUnderlineOut{from{opacity:1}to{opacity:.0}}
 .region-expand-underline::after,
 .region-collapse-underline::after{
   content:""; position:absolute; left:0; right:0; bottom:-4px; height:2px;
   background:linear-gradient(90deg, rgba(255,255,255,.0), rgba(255,255,255,.35), rgba(255,255,255,.0));
   transform-origin:left center;
 }
 .region-expand-underline::after{animation:hdrULDraw var(--exp-dur,.8s) ease both;}
 .region-collapse-underline::after{animation:hdrULErase var(--exp-dur,.8s) ease both;}
 @keyframes hdrULDraw{from{transform:scaleX(.2);opacity:.4}to{transform:scaleX(1);opacity:.9}}
 @keyframes hdrULErase{from{transform:scaleX(1);opacity:.9}to{transform:scaleX(.2);opacity:.4}}

 /* Ripple (highlight glow pulse) */
 .region-expand-ripple{animation:hdrRippleIn var(--exp-dur,.8s) ease both;}
 .region-collapse-ripple{animation:hdrRippleOut var(--exp-dur,.8s) ease both;}
 @keyframes hdrRippleIn{0%{box-shadow:0 0 0 0 rgba(255,255,255,.0)}50%{box-shadow:0 0 calc(6px + 6px * var(--exp-int,.6)) rgba(255,255,255,.25)}100%{box-shadow:0 0 0 0 rgba(255,255,255,.0)}}
 @keyframes hdrRippleOut{0%{box-shadow:0 0 calc(6px + 6px * var(--exp-int,.6)) rgba(255,255,255,.25)}100%{box-shadow:0 0 0 0 rgba(255,255,255,.0)}}

 /* Glitch (jitter steps) */
 .region-expand-glitch{animation:hdrGlitchIn var(--exp-dur,.8s) steps(6,end) both;}
 .region-collapse-glitch{animation:hdrGlitchOut var(--exp-dur,.8s) steps(6,end) both;}
 @keyframes hdrGlitchIn{0%{transform:translate(0,0);opacity:0}30%{transform:translate(-1px,1px);opacity:.6}60%{transform:translate(1px,-1px);opacity:.85}100%{transform:translate(0,0);opacity:1}}
 @keyframes hdrGlitchOut{0%{transform:translate(0,0);opacity:1}30%{transform:translate(1px,-1px);opacity:.85}60%{transform:translate(-1px,1px);opacity:.6}100%{transform:translate(0,0);opacity:0}}

 @keyframes rbFadeIn{from{opacity:0}to{opacity:1}}
 @keyframes rbFadeOut{from{opacity:1}to{opacity:0}}
 @keyframes rbSlideDownIn{from{opacity:.0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
 @keyframes rbSlideDownOut{from{opacity:1;transform:translateY(0)}to{opacity:.0;transform:translateY(-8px)}}
 @keyframes rbSlideUpIn{from{opacity:.0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
 @keyframes rbSlideUpOut{from{opacity:1;transform:translateY(0)}to{opacity:.0;transform:translateY(8px)}}
 @keyframes rbZoomIn{from{opacity:.0;transform:scale(calc(1 - .06 * var(--rb-int,.5)))}to{opacity:1;transform:scale(1)}}
 @keyframes rbZoomOut{from{opacity:1;transform:scale(1)}to{opacity:.0;transform:scale(calc(1 - .06 * var(--rb-int,.5)))}}
 @keyframes rbZoomOutIn{from{opacity:.0;transform:scale(calc(1 + .06 * var(--rb-int,.5)))}to{opacity:1;transform:scale(1)}}
 @keyframes rbZoomInOut{from{opacity:1;transform:scale(1)}to{opacity:.0;transform:scale(calc(1 + .06 * var(--rb-int,.5)))}}
 `;
    }
    function embeddedThemeCss(name) {
      var map = {
        'theme-steampunk': `/* theme-steampunk (embedded) */
${`/* --- 新增主题 X: 蒸汽朋克 (Steampunk) --- */
.theme-steampunk {
    --steam-brass: #B08D57;
    --steam-copper: #C1693C;
    --steam-iron: #2E2E2E;
    --steam-parchment: #F1E6D0;
    font-family: 'Cinzel', 'Noto Serif SC', 'Times New Roman', Georgia, 'Songti SC', serif;
    background:
        radial-gradient(600px 300px at 18% 12%, rgba(192,135,79,.10), transparent),
        radial-gradient(800px 400px at 82% 18%, rgba(255,228,185,.08), transparent),
        linear-gradient(180deg, rgba(255,255,255,.04), rgba(0,0,0,.08)),
        #121212;
    color: var(--steam-parchment);
    border: 1.5px solid rgba(176,141,87,.55);
    border-radius: 12px;
    box-shadow:
      0 12px 28px rgba(0,0,0,.35),
      inset 0 0 22px rgba(176,141,87,.12),
      inset 0 0 14px rgba(0,0,0,.25);
    padding: 18px;
    position: relative;
}
.theme-steampunk::before {
    content: '';
    position: absolute;
    left: 0; right: 0; bottom: 0;
    height: 60%;
    pointer-events: none;
    background: linear-gradient(180deg, rgba(255,255,255, calc(.08 * var(--anim-intensity))), transparent 60%);
    filter: blur(6px);
    opacity: .20;
    animation: steamRise calc(var(--anim-speed) * 6) ease-in-out infinite;
}
/* 高级动效叠加：蒸汽漂移粒子（与导出一致） */
.theme-steampunk::after {
    content: '';
    position: absolute; inset: 0;
    pointer-events: none;
    background:
      radial-gradient(300px 120px at 30% 90%, rgba(255,255,255,.06), transparent 60%),
      radial-gradient(240px 96px at 70% 95%, rgba(255,255,255,.05), transparent 60%);
    opacity: calc(.18 * var(--anim-intensity));
    animation: steamDrift calc(var(--anim-speed) * 8) linear infinite;
}
.theme-steampunk .st-header {
    display:flex; align-items:center; justify-content:space-between;
    padding-bottom: 10px; margin-bottom: 10px;
    border-bottom: 1px dashed rgba(176,141,87,.35);
}
.theme-steampunk .st-header-icon {
    width: 28px; height: 28px; border-radius: 50%;
    display:grid; place-items:center;
    background: radial-gradient(closest-side, rgba(176,141,87,.18), transparent);
    box-shadow: inset 0 0 10px rgba(0,0,0,.35);
}
.theme-steampunk .st-header-icon svg {
    animation: gearSpin calc(var(--anim-speed) * 3) linear infinite;
    transform-origin: center;
    stroke: var(--steam-brass);
}
.theme-steampunk .st-title {
    font-size: 22px;
    color: var(--steam-brass);
    text-shadow: 0 0 calc(6px + 6px * var(--anim-intensity)) rgba(176,141,87,.35);
    letter-spacing: .02em;
    /* 高级动效：黄铜标题微脉冲（与导出一致） */
    animation: brassPulse calc(var(--anim-speed) * 3) ease-in-out infinite;
}
.theme-steampunk .st-body { display:grid; gap: 12px; }
.theme-steampunk .st-item {
    display:flex; align-items:center; justify-content:space-between;
    padding: 10px; border-radius: 10px;
    background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(0,0,0,.08));
    box-shadow: inset 0 0 10px rgba(0,0,0,.25);
}
.theme-steampunk .st-label { color: rgba(241,230,208,.90); display:flex; align-items:center; gap:.6em; }
.theme-steampunk .st-value { color: #f7f0df; font-weight: 600; }
.theme-steampunk .st-progress-bar {
    height: 10px; background: #191919;
    border: 1px solid rgba(176,141,87,.45);
    border-radius: 6px; overflow:hidden;
    box-shadow: inset 0 0 8px rgba(0,0,0,.35);
}
.theme-steampunk .st-progress-bar-fill {
    height: 100%;
    width: 60%;
    background: linear-gradient(90deg, var(--steam-copper), var(--steam-brass));
    box-shadow: 0 0 calc(6px + 6px * var(--anim-intensity)) rgba(176,141,87,.35);
}
.theme-steampunk hr {
    border:none; height:1px;
    background-image: linear-gradient(to right, transparent, rgba(176,141,87,.65), transparent);
}
@keyframes gearSpin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
@keyframes steamRise { 0% { transform: translateY(10%); opacity: .10; } 50%{ opacity:.22; } 100% { transform: translateY(-12%); opacity:.08; } }
/* 新增关键帧：蒸汽漂移与黄铜脉冲 */
@keyframes steamDrift { 0%{ transform: translateY(4%) } 100%{ transform: translateY(-4%) } }
@keyframes brassPulse {
  0%,100%{ text-shadow:0 0 calc(6px + 6px * var(--anim-intensity)) rgba(176,141,87,.30) }
  50%{ text-shadow:0 0 calc(10px + 10px * var(--anim-intensity)) rgba(176,141,87,.50) }
}`}`,
        'theme-mystic-noir': `/* theme-mystic-noir (embedded) */
${`/* --- 主题 1: 暗黑神秘 (Mystic Noir) --- */
.theme-mystic-noir {
    --st-ink: #0b0b0d;
    --st-paper: #111215;
    --st-bone: #d6d6d6;
    --st-cold-bone: #c8cbd2;
    --st-shadow: rgba(0,0,0,.65);
    --st-glow: rgba(255,255,255,.05);

    font-family: Georgia, "Songti SC", serif;
    background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.01)), var(--st-paper);
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 12px;
    box-shadow: 0 20px 60px var(--st-shadow), inset 0 0 40px var(--st-glow);
    padding: 10px;
    position: relative;
    color: var(--st-bone);
}
.theme-mystic-noir .st-header { display: flex; align-items: center; gap: .6em; padding: 12px; border-bottom: 1px solid rgba(255,255,255,.08); }
.theme-mystic-noir .st-header-icon {
    width: 28px; height: 28px; border: 1px solid rgba(255,255,255,.2); border-radius: 50%;
    display: grid; place-items:center; background: radial-gradient(closest-side, rgba(255,255,255,.07), transparent);
    box-shadow: inset 0 0 12px rgba(255,255,255,.06);
}
.theme-mystic-noir .st-title { font-size: 20px; color: var(--st-cold-bone); }
.theme-mystic-noir .st-body { padding: 16px; display: grid; gap: 12px; }
.theme-mystic-noir .st-item { display:flex; align-items:center; justify-content:space-between; padding: 10px; border-radius: 10px; background: rgba(255,255,255,.03); }
.theme-mystic-noir .st-label { display:flex; align-items:center; gap:.6em; opacity: .9; }
.theme-mystic-noir .st-value { font-weight: 500; opacity: .95; text-align: right; }
.theme-mystic-noir .st-progress-bar { height: 8px; background: rgba(0,0,0,0.4); border-radius: 4px; overflow: hidden; }
.theme-mystic-noir .st-progress-bar-fill { height: 100%; width: 75%; background: var(--st-cold-bone); }
.theme-mystic-noir hr { border: none; height: 1px; background-color: rgba(255,255,255,.08); margin: 4px 0; }

/* 暗黑神秘：格点叠加层（与不透明底色叠加） */
.theme-mystic-noir::before {
    content: '';
    position: absolute; inset: 0;
    pointer-events: none;
    /* 细格点：参考面板格点，但更低透明度以保持神秘质感 */
    background-image: radial-gradient(rgba(255,255,255,.06) 1px, transparent 1px);
    background-size: 18px 18px;
    opacity: calc(.10 * var(--anim-intensity));
    animation: mysticGridPan calc(var(--anim-speed) * 10) linear infinite;
}
@keyframes mysticGridPan { 0% { background-position: 0 0; } 100% { background-position: 18px 18px; } }`}`,
        'theme-neon-night': `/* theme-neon-night (embedded) */
${`/* --- 新增主题 4: 霓虹夜色 (Neon Night) --- */
.theme-neon-night {
    --st-bg: #0d0f1a;
    --st-neon: #00f7ff;
    --st-pink: #ff00a6;
    --st-border: rgba(255,255,255,0.08);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: radial-gradient(1000px 400px at 10% 10%, rgba(0,247,255,.08), transparent),
                radial-gradient(800px 300px at 90% 20%, rgba(255,0,166,.08), transparent),
                var(--st-bg);
    color: #e8f9ff;
    border: 1px solid var(--st-border);
    border-radius: 14px;
    box-shadow: 0 0 24px rgba(0, 247, 255, .15), inset 0 0 24px rgba(255, 0, 166, .08);
    padding: 18px;
    position: relative;
}
/* 高级动效：扫光叠加，强度与速度跟随变量 */
.theme-neon-night::after {
    content: '';
    position: absolute; inset: 0;
    pointer-events: none;
    background: linear-gradient(90deg, transparent, rgba(255,255,255, .08), transparent);
    opacity: calc(.16 * var(--anim-intensity));
    animation: shimmerMove calc(var(--anim-speed) * 2) ease-in-out infinite;
}
/* 高级动效：箱体脉冲，与变量联动 */
.theme-neon-night { animation: neonPulse calc(var(--anim-speed) * 3) ease-in-out infinite; }
@keyframes neonPulse {
  0%,100%{ box-shadow:0 0 24px rgba(0,247,255,.15), inset 0 0 24px rgba(255,0,166,.08) }
  50%{ box-shadow:0 0 36px rgba(0,247,255,.25), inset 0 0 36px rgba(255,0,166,.14) }
}
.theme-neon-night .st-header { display:flex; align-items:center; justify-content:space-between; margin-bottom: 10px; }
.theme-neon-night .st-title { font-size: 22px; color: var(--st-neon); text-shadow: 0 0 8px rgba(0,247,255,.7); }
.theme-neon-night .st-body { display:grid; gap: 10px; }
.theme-neon-night .st-item { display:flex; justify-content:space-between; align-items:center; padding: 10px; background: rgba(255,255,255,.03); border-radius: 8px; }
.theme-neon-night .st-label { color: #a7e9ff; }
.theme-neon-night .st-value { color: #ffffff; font-weight: 600; text-shadow: 0 0 6px rgba(255,255,255,.2); }
.theme-neon-night .st-progress-bar { height: 8px; background: rgba(0,0,0,.4); border: 1px solid rgba(0,247,255,.3); border-radius:4px; padding: 1px; }
.theme-neon-night .st-progress-bar-fill { height: 100%; width: 65%; background: linear-gradient(90deg, var(--st-pink), var(--st-neon)); box-shadow: 0 0 12px rgba(255,0,166,.5); }
.theme-neon-night hr { border:none; height:1px; background: linear-gradient(to right, transparent, rgba(0,247,255,.7), transparent); }`}`,
        'theme-cyber-grid': `/* theme-cyber-grid (embedded) */
${`/* --- 主题 2: 未来科技 (Cyber Grid) --- */
.theme-cyber-grid {
    --st-bg: #1A2238;
    --st-primary: #9DAAF2;
    --st-accent: #FF6A3D;
    --st-glow: 0 0 8px rgba(255, 106, 61, 0.7);
    --st-border: 1px solid #4a5a94;

    font-family: 'Courier New', Courier, monospace;
    background-color: var(--st-bg);
    border: var(--st-border);
    border-radius: 4px;
    padding: 16px;
    box-shadow: inset 0 0 15px rgba(157, 170, 242, 0.2);
    position: relative;
}
.theme-cyber-grid::before { /* Grid background */
    content: ''; position: absolute; inset: 0; pointer-events: none;
    background-image: linear-gradient(rgba(157,170,242,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(157,170,242,0.1) 1px, transparent 1px);
    background-size: 20px 20px;
    animation: bg-pan 10s linear infinite;
}
@keyframes bg-pan { 0% { background-position: 0 0; } 100% { background-position: 40px 40px; } }
.theme-cyber-grid .st-header { padding-bottom: 8px; border-bottom: var(--st-border); margin-bottom: 12px; }
.theme-cyber-grid .st-title { font-size: 22px; color: var(--st-accent); text-shadow: var(--st-glow); }
.theme-cyber-grid .st-body { display: grid; gap: 10px; }
.theme-cyber-grid .st-item { display: flex; justify-content: space-between; align-items: baseline; }
.theme-cyber-grid .st-label { color: var(--st-primary); }
.theme-cyber-grid .st-label::before { content: '>> '; color: var(--st-accent); }
.theme-cyber-grid .st-value { color: #ffffff; font-weight: bold; }
.theme-cyber-grid .st-progress-bar { height: 10px; border: var(--st-border); padding: 1px; }
.theme-cyber-grid .st-progress-bar-fill { height: 100%; width: 60%; background-color: var(--st-accent); box-shadow: var(--st-glow); }
.theme-cyber-grid hr { border: none; height: 1px; background-image: linear-gradient(to right, transparent, var(--st-accent), transparent); margin: 6px 0; }`}`,
        'theme-glassmorphism': `/* theme-glassmorphism (embedded) */
${`/* --- 新增主题 8: 玻璃拟态 (Glassmorphism) --- */
.theme-glassmorphism {
    font-family: Inter, 'Noto Sans SC', sans-serif;
    background: rgba(255,255,255,.08);
    border: 1px solid rgba(255,255,255,.2);
    border-radius: 16px;
    box-shadow: 0 20px 40px rgba(0,0,0,.25), inset 0 0 30px rgba(255,255,255,.06);
    padding: 18px;
    color: #eaf7ff;
    backdrop-filter: blur(10px);
}
.theme-glassmorphism .st-header { display:flex; align-items:center; justify-content:space-between; margin-bottom: 12px; }
.theme-glassmorphism .st-title { font-size: 22px; color: #6EE7F9; text-shadow: 0 0 10px rgba(110,231,249,.6); }
.theme-glassmorphism .st-body { display:grid; gap: 12px; }
.theme-glassmorphism .st-item { display:flex; justify-content:space-between; align-items:center; padding: 10px; background: rgba(255,255,255,.06); border-radius: 12px; }
.theme-glassmorphism .st-label { color: #A78BFA; }
.theme-glassmorphism .st-value { color: #6EE7F9; font-weight: 600; }
.theme-glassmorphism .st-progress-bar { height: 8px; background: rgba(0,0,0,.25); border-radius: 4px; }
.theme-glassmorphism .st-progress-bar-fill { height: 100%; width: 70%; background: linear-gradient(90deg, #A78BFA, #6EE7F9); box-shadow: 0 0 12px rgba(110,231,249,.4); }
.theme-glassmorphism hr { border:none; height:1px; background-image: linear-gradient(to right, transparent, rgba(110,231,249,.8), transparent); }`}`,
        'theme-paper-journal': `/* theme-paper-journal (embedded) */
${`/* --- 新增主题 X2: 纸质手账 (Paper Journal) --- */
.theme-paper-journal {
    --paper-cream: #F5ECD7;
    --ink-brown: #5A4635;
    --tape-accent: #C7A27B;
    font-family: 'Noto Serif SC', 'Songti SC', Georgia, serif;
    background:
        radial-gradient(700px 300px at 20% 10%, rgba(199,162,123,.15), transparent),
        linear-gradient(180deg, #f8f1e4, #efe6d4);
    color: var(--ink-brown);
    border: 1px solid rgba(90,70,53,.35);
    border-radius: 12px;
    box-shadow: 0 10px 24px rgba(0,0,0,.20), inset 0 0 20px rgba(255,255,255,.30);
    padding: 18px;
    position: relative;
}
/* 高级动效：纸张颗粒叠加 */
.theme-paper-journal::after {
    content: '';
    position: absolute; inset: 0;
    pointer-events: none;
    background:
      repeating-linear-gradient(0deg, rgba(0,0,0,.015) 0 2px, transparent 2px 4px),
      repeating-linear-gradient(90deg, rgba(0,0,0,.012) 0 2px, transparent 2px 4px);
    mix-blend-mode: multiply;
    opacity: calc(.12 * var(--anim-intensity));
    animation: grainShift calc(var(--anim-speed) * 10) linear infinite;
}
.theme-paper-journal .st-header {
    display:flex; align-items:center; justify-content:space-between;
    padding-bottom: 10px; margin-bottom: 10px;
    border-bottom: 1px solid rgba(90,70,53,.35);
    position: relative;
}
.theme-paper-journal .st-header::before {
    content: '';
    position: absolute;
    left: 8px; top: -6px;
    width: 80px; height: 16px;
    background: linear-gradient(135deg, rgba(199,162,123,.55), rgba(230,210,180,.55));
    transform: rotate(-3deg);
    filter: drop-shadow(0 2px 2px rgba(0,0,0,.15));
    pointer-events: none;
    opacity: calc(.7 * var(--anim-intensity));
    animation: pageTurn calc(var(--anim-speed) * 4) ease-in-out infinite;
}
.theme-paper-journal .st-title {
    font-size: 22px;
    color: var(--ink-brown);
    text-shadow: 0 1px 0 rgba(255,255,255,.5);
    letter-spacing: .01em;
}
.theme-paper-journal .st-body { display:grid; gap: 12px; }
.theme-paper-journal .st-item {
    display:flex; align-items:center; justify-content:space-between;
    padding: 10px; border-radius: 10px;
    background: rgba(255,255,255,.35);
    box-shadow: inset 0 0 10px rgba(0,0,0,.06);
    /* 高级动效：卡片轻浮动 */
    animation: paperFloat calc(var(--anim-speed) * 6) ease-in-out infinite;
}
.theme-paper-journal .st-label { color: #4a3c2b; display:flex; align-items:center; gap:.6em; }
.theme-paper-journal .st-value { color: #3a3126; font-weight: 600; }
.theme-paper-journal .st-progress-bar {
    height: 8px; background: rgba(0,0,0,.08);
    border: 1px solid rgba(90,70,53,.35);
    border-radius: 6px; overflow:hidden;
}
.theme-paper-journal .st-progress-bar-fill {
    height: 100%;
    width: 60%;
    background: linear-gradient(90deg, #d7b693, #b48a60);
    box-shadow: 0 0 calc(4px + 6px * var(--anim-intensity)) rgba(180,138,96,.35);
}
.theme-paper-journal hr {
    border:none; height:1px;
    background-image: linear-gradient(to right, transparent, rgba(90,70,53,.55), transparent);
}
@keyframes pageTurn { 0%{transform:rotate(-3deg)}50%{transform:rotate(-6deg)}100%{transform:rotate(-3deg)} }
/* 新增关键帧：颗粒漂移与卡片浮动 */
@keyframes grainShift { 0%{ background-position:0 0, 0 0 } 100%{ background-position:20px 12px, 12px 20px } }
@keyframes paperFloat { 0%{ transform: translateY(0) } 50%{ transform: translateY(-1px) } 100%{ transform: translateY(0) } }`}`,
        'theme-pixel-retro': `/* theme-pixel-retro (embedded) */
${`/* --- 新增主题 X4: 像素复古 (Pixel Retro) --- */
.theme-pixel-retro {
    --crt-green: #64FF64;
    --crt-dark: #0c0c0c;
    --crt-edge: #3a3a3a;
    font-family: 'Courier New', Courier, monospace;
    background:
        repeating-linear-gradient(0deg, rgba(255,255,255,.02) 0 2px, transparent 2px 4px),
        var(--crt-dark);
    color: #d0ffd0;
    border: 2px solid var(--crt-edge);
    border-radius: 6px;
    box-shadow: inset 0 0 0 1px #000, 0 12px 24px rgba(0,0,0,.40);
    padding: 16px;
    position: relative;
    overflow: hidden; /* 限制扫描线动画在框内 */
    image-rendering: pixelated;
    /* 高级动效：CRT 轻微抖动 */
    animation: crtJitter calc(var(--anim-speed) * 8) steps(2) infinite;
}
.theme-pixel-retro::after {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(180deg, rgba(255,255,255,.05), rgba(0,0,0,0) 40%, rgba(255,255,255,.05) 60%, rgba(0,0,0,0));
    mix-blend-mode: screen;
    opacity: calc(.5 * var(--anim-intensity));
    animation: crtScan calc(var(--anim-speed) * 3) linear infinite, crtFlicker calc(var(--anim-speed) * 5) steps(3) infinite;
    pointer-events: none;
}
.theme-pixel-retro .st-header {
    display:flex; align-items:center; justify-content:space-between;
    padding-bottom: 8px; margin-bottom: 8px;
    border-bottom: 1px solid var(--crt-edge);
}
.theme-pixel-retro .st-title {
    font-size: 18px;
    color: var(--crt-green);
    text-shadow: 0 0 6px rgba(100,255,100,.35);
    letter-spacing: .04em;
}
.theme-pixel-retro .st-body { display:grid; gap: 10px; }
.theme-pixel-retro .st-item {
    display:flex; align-items:center; justify-content:space-between;
    padding: 8px; border-radius: 4px;
    background: rgba(255,255,255,.03);
    box-shadow: inset 0 0 0 1px #000;
}
.theme-pixel-retro .st-label { color: #b9ffb9; display:flex; align-items:center; gap:.6em; }
.theme-pixel-retro .st-value { color: #eaffea; font-weight: 700; letter-spacing: .02em; }
.theme-pixel-retro .st-progress-bar {
    height: 10px; background: rgba(0,0,0,.6);
    border: 1px solid var(--crt-edge);
    border-radius: 0; overflow:hidden;
}
.theme-pixel-retro .st-progress-bar-fill {
    height: 100%;
    width: 60%;
    background-image: repeating-linear-gradient(90deg, #64FF64 0 6px, #3ADB3A 6px 12px);
    box-shadow: 0 0 calc(6px + 6px * var(--anim-intensity)) rgba(100,255,100,.35);
}
.theme-pixel-retro hr {
    border:none; height:1px;
    background: linear-gradient(to right, transparent, #64FF64, transparent);
}
@keyframes crtScan { 0%{transform:translateY(-100%)}100%{transform:translateY(100%)} }
/* 新增关键帧：抖动与闪烁 */
@keyframes crtJitter { 0%{ transform: translateY(0) } 50%{ transform: translateY(0.5px) } 100%{ transform: translateY(0) } }
@keyframes crtFlicker { 0%,100%{ opacity: calc(.45 * var(--anim-intensity)) } 50%{ opacity: calc(.55 * var(--anim-intensity)) } }`}`,
        'theme-nature-aura': `/* theme-nature-aura (embedded) */
${`/* --- 新增主题 N1: 自然灵韵 (Nature Aura) --- */
.theme-nature-aura {
    --na-green: #64D58B;
    --na-leaf: #3B8C6E;
    --na-mist: rgba(100,213,139,.12);
    --na-border: rgba(100,213,139,.35);
    font-family: 'Noto Serif SC', 'Songti SC', Georgia, serif;
    background:
      radial-gradient(800px 400px at 15% 10%, var(--na-mist), transparent 60%),
      radial-gradient(1000px 500px at 85% 15%, rgba(167,215,197,.12), transparent 65%),
      linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.08)),
      #0f1714;
    color: #eaf7ef;
    border: 1px solid var(--na-border);
    border-radius: 14px;
    box-shadow: 0 14px 32px rgba(0,0,0,.35), inset 0 0 24px rgba(100,213,139,.08);
    padding: 18px;
    position: relative;
    overflow: hidden;
}
/* 阳光扫光（与变量联动） */
.theme-nature-aura::before{
    content:'';
    position:absolute; inset:-10% -30%;
    background: linear-gradient(100deg, transparent 35%, rgba(255,255,255, calc(.10 * var(--anim-intensity))) 50%, transparent 65%);
    transform: rotate(2deg);
    animation: sunRaySweep calc(var(--anim-speed) * 6) linear infinite;
    pointer-events:none;
}
@keyframes sunRaySweep {
  0% { transform: translateX(-20%) rotate(2deg); }
  100% { transform: translateX(20%) rotate(2deg); }
}
.theme-nature-aura .st-header{
    display:flex; align-items:center; justify-content:space-between;
    padding-bottom:10px; margin-bottom:10px;
    border-bottom: 1px solid rgba(100,213,139,.25);
}
.theme-nature-aura .st-title{
    font-size:22px; color: var(--na-green);
    text-shadow: 0 0 calc(6px + 6px * var(--anim-intensity)) rgba(100,213,139,.25);
    letter-spacing:.01em;
}
.theme-nature-aura .st-body{ display:grid; gap:12px; }
.theme-nature-aura .st-item{
    display:flex; align-items:center; justify-content:space-between;
    padding:10px; border-radius:12px;
    background: rgba(255,255,255,.04);
    box-shadow: inset 0 0 10px rgba(0,0,0,.15);
}
.theme-nature-aura .st-label{ color:#cfeee0; display:flex; align-items:center; gap:.6em; }
.theme-nature-aura .st-value{ color:#eaf7ef; font-weight:600; }
.theme-nature-aura .st-progress-bar{
    height:8px; background: rgba(0,0,0,.35);
    border:1px solid rgba(100,213,139,.35);
    border-radius:999px; overflow:hidden;
}
.theme-nature-aura .st-progress-bar-fill{
    height:100%;
    background: linear-gradient(90deg, #46c971, #bff3cf);
    box-shadow: 0 0 calc(6px + 6px * var(--anim-intensity)) rgba(100,213,139,.35);
}
.theme-nature-aura hr{
    border:none; height:1px;
    background-image: linear-gradient(to right, transparent, rgba(100,213,139,.55), transparent);
    margin:4px 0;
}`}`,
        'theme-modern-minimal': `/* theme-modern-minimal (embedded) */
${`/* --- 新增主题 X5: 简约现代 (Modern Minimal) --- */
.theme-modern-minimal {
    --mm-bg: #121212;
    --mm-text: #eaeaea;
    --mm-border: rgba(255,255,255,.10);
    --mm-accent: #ffffff;
    font-family: Inter, 'Noto Sans SC', sans-serif;
    background: var(--mm-bg);
    color: var(--mm-text);
    border: 1px solid var(--mm-border);
    border-radius: 12px;
    box-shadow: 0 8px 20px rgba(0,0,0,.25);
    padding: 16px;
    position: relative;
}
.theme-modern-minimal .st-header {
    display:flex; align-items:center; justify-content:space-between;
    padding-bottom: 8px; margin-bottom: 8px;
    border-bottom: 1px solid var(--mm-border);
}
.theme-modern-minimal .st-title {
    font-size: 20px;
    color: var(--mm-accent);
    text-shadow: 0 0 calc(4px + 6px * var(--anim-intensity)) rgba(255,255,255,.10);
    letter-spacing: .01em;
}
.theme-modern-minimal .st-body { display:grid; gap: 10px; }
.theme-modern-minimal .st-item {
    display:flex; align-items:center; justify-content:space-between;
    padding: 10px; border-radius: 10px;
    background: rgba(255,255,255,.04);
    box-shadow: inset 0 0 10px rgba(0,0,0,.12);
}
.theme-modern-minimal .st-label { color: #cfd6df; display:flex; align-items:center; gap:.6em; }
.theme-modern-minimal .st-value { color: #ffffff; font-weight: 600; }
.theme-modern-minimal .st-progress-bar {
    height: 8px; background: rgba(0,0,0,.35);
    border: 1px solid var(--mm-border);
    border-radius: 999px; overflow:hidden;
}
.theme-modern-minimal .st-progress-bar-fill {
    height: 100%;
    width: 60%;
    background: linear-gradient(90deg, #ffffff, #cfd6df);
    box-shadow: 0 0 calc(6px + 6px * var(--anim-intensity)) rgba(255,255,255,.18);
}
.theme-modern-minimal hr {
    border:none; height:1px;
    background: linear-gradient(to right, transparent, rgba(255,255,255,.35), transparent);
}
@keyframes minimalPulse { 0%{transform:scale(1)}50%{transform:scale(1.01)}100%{transform:scale(1)} }`}`,
        'theme-ink-wash': `/* theme-ink-wash (embedded) */
${`/* --- 新增主题 N2: 水墨留白 (Ink Wash) --- */
.theme-ink-wash{
    --iw-ink:#2A2A2A;
    --iw-paper-top:#f6f1e7;
    --iw-paper-btm:#efe7d9;
    --iw-edge: rgba(0,0,0,.15);
    font-family: 'Noto Serif SC', 'Songti SC', Georgia, serif;
    background:
      radial-gradient(1200px 700px at 15% 10%, rgba(0,0,0,.05), transparent 60%),
      radial-gradient(1000px 600px at 85% 20%, rgba(0,0,0,.035), transparent 60%),
      radial-gradient(800px 500px at 50% 80%, rgba(0,0,0,.025), transparent 65%),
      linear-gradient(180deg, var(--iw-paper-top), var(--iw-paper-btm));
    color: var(--iw-ink);
    border: 1px solid var(--iw-edge);
    border-radius: 14px;
    box-shadow: 0 10px 24px rgba(0,0,0,.15), inset 0 0 18px rgba(255,255,255,.35);
    padding: 18px;
    position: relative;
    overflow: hidden;
}
/* 背景水墨晕染层（去除横纹，采用多点晕染） */
.theme-ink-wash::before{
    content:'';
    position:absolute; inset:-8%;
    background:
      radial-gradient(420px 300px at 18% 22%, rgba(0,0,0,.06), transparent 60%),
      radial-gradient(520px 360px at 78% 18%, rgba(0,0,0,.05), transparent 60%),
      radial-gradient(380px 280px at 45% 70%, rgba(0,0,0,.035), transparent 65%);
    mix-blend-mode: multiply;
    opacity: calc(.20 * var(--anim-intensity));
    animation: inkDrift calc(var(--anim-speed) * 12) linear infinite;
    pointer-events: none;
}
/* 墨晕层（随速度/强度呼吸） */
.theme-ink-wash::after{
    content:'';
    position:absolute; inset:-10%;
    background:
      radial-gradient(260px 180px at 20% 25%, rgba(0,0,0,.06), transparent 60%),
      radial-gradient(220px 160px at 80% 30%, rgba(0,0,0,.05), transparent 60%);
    mix-blend-mode: multiply;
    opacity: calc(.18 * var(--anim-intensity));
    animation: inkBloom calc(var(--anim-speed) * 8) ease-in-out infinite;
    pointer-events: none;
}
@keyframes inkBloom {
  0%,100%{ transform: scale(1); opacity: calc(.16 * var(--anim-intensity)) }
  50%{ transform: scale(1.02); opacity: calc(.24 * var(--anim-intensity)) }
}
@keyframes inkDrift {
  0%   { transform: translate(0, 0) }
  100% { transform: translate(2%, -2%) }
}
.theme-ink-wash .st-header{
    display:flex; align-items:center; justify-content:space-between;
    padding-bottom: 10px; margin-bottom: 10px;
    border-bottom: 1px solid rgba(0,0,0,.15);
    position: relative;
}
.theme-ink-wash .st-title{
    font-size:22px; color: var(--iw-ink);
    letter-spacing:.02em;
    position: relative;
}
/* 标题笔触下划线（绘制动画） */
.theme-ink-wash .st-title::after{
    content:''; position:absolute; left:0; right:0; bottom:-6px; height:6px;
    background:
      linear-gradient(90deg, rgba(0,0,0,.35) 0%, rgba(0,0,0,.65) 40%, rgba(0,0,0,.15) 100%);
    filter: blur(0.4px);
    transform-origin: left center;
    transform: scaleX(0.2);
    animation: strokeDraw calc(var(--anim-speed) * 4) ease-in-out infinite;
}
@keyframes strokeDraw {
  0%{ transform: scaleX(0.2); opacity:.5 }
  50%{ transform: scaleX(1); opacity:.9 }
  100%{ transform: scaleX(0.2); opacity:.5 }
}
.theme-ink-wash .st-body{ display:grid; gap:12px; }
.theme-ink-wash .st-item{
    display:flex; align-items:center; justify-content:space-between;
    padding: 10px; border-radius: 10px;
    background: rgba(255,255,255,.45);
    box-shadow: inset 0 0 10px rgba(0,0,0,.06);
}
.theme-ink-wash .st-label{ color:#7A6248; }
.theme-ink-wash .st-value{ color:#1e1e1e; font-weight:600; }
.theme-ink-wash .st-progress-bar{
    height:8px; background: rgba(0,0,0,.08);
    border: 1px solid rgba(0,0,0,.15);
    border-radius:6px; overflow:hidden;
}
.theme-ink-wash .st-progress-bar-fill{
    height:100%;
    background:
      linear-gradient(90deg, #2A2A2A, #444),
      repeating-linear-gradient(90deg, rgba(255,255,255,.08) 0 6px, rgba(255,255,255,0) 6px 12px);
    box-shadow: 0 0 calc(5px + 6px * var(--anim-intensity)) rgba(0,0,0,.25);
}
.theme-ink-wash hr{
    border:none; height:1px;
    background: linear-gradient(to right, transparent, rgba(0,0,0,.35), transparent);
}`}`
      };
      return map[name] || '';
    }
    function buildEmbeddedBundle(themeName) {
      var parts = [];
      var theme = embeddedThemeCss(themeName);
      var effects = embeddedEffectsCss();
      // UI 基础（如确实需要可启用）：const ui = __stripImports(embeddedUiCss());
      if (/\S/.test(theme)) { parts.push('/* ====== embedded: theme (' + (themeName || 'unknown') + ') ====== */'); parts.push(theme); }
      if (/\S/.test(effects)) { parts.push('/* ====== embedded: ny-ui-effects.css ====== */'); parts.push(effects); }
      // 如果需要补充 UI 基础样式，请取消注释以下两行：
      // if (/\S/.test(ui)) { parts.push('/* ====== embedded: ny-ui.css (stripped @import) ====== */'); parts.push(ui); }
      return parts.join('\n\n');
    }
    function inlineFromEmbeddedBundle(doc) {
      try {
        var html = String(doc || '');
        
        // 🔒 幂等性保护: 检查CSS是否已被内联
        if (html.indexOf('data-ny-css-inlined="true"') !== -1) {
          console.log('[Export] CSS already inlined (embedded), skipping');
          return html;
        }
        var m = html.match(/class\s*=\s*["']([^"']*status-preview-wrapper[^"']*)["']/i);
        var wrapCls = m ? m[1] : '';
        var themeName = (wrapCls && (wrapCls.match(/theme-[a-z0-9-]+/i) || [])[0]) || '';
        var bundled = buildEmbeddedBundle(themeName);
        // Ensure region header glass subset present (no ny-ui.css in export)
        try { if (bundled.indexOf('.st-region-header.hdr-mode-glass') === -1) { bundled += '\n' + regionHeaderGlassCss(); } } catch(_eRH){}
        // Guard: ensure background layers subset always present in embedded bundle
        try { if (bundled.indexOf('.status-preview-wrapper .bg-layers') === -1) { bundled += '\n' + bgLayersSubsetCss(); } } catch(_eBgEmb){}
        // 若文档包含 BoutiqueBitmap9x9，嵌入式兜底路径也在样式顶部追加 @import，匹配你提供的成功示例
        try {
          var __pre = (/\bBoutiqueBitmap9x9\b/.test(html) ? "@import url('https://fontsapi.zeoseven.com/65/main/result.css');\n" : '');
          if (__pre) bundled = __pre + bundled;
        } catch(_e_pre) {}
        // Append responsive layout subset to ensure mobile parity
        bundled += '\n' + responsiveLayoutCss();
        // Ensure collapsed region fold rules present to remove all placeholder space on collapse
        bundled += "\n/* collapsed region fold rules */\n.st-region.collapsed > .st-region-body{display:none !important;margin:0 !important;padding:0 !important;}\n.st-region.collapsed{margin-bottom:0 !important;}\n.st-region.collapsed .st-region-header{margin-bottom:0 !important;}";
        var check = bundled.replace(/\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, '').trim();
        if (!/\S/.test(check)) throw new Error('embedded CSS 为空');
        var withoutLinks = html
          .replace(/<link[^>]+href="ny-[^"]+\.css"[^>]*>\s*/g, '')
          .replace(/<link\b[^>]*data-ny-custom-font=["']true["'][^>]*>\s*/gi, '')
          .replace(/<style\s+id=["']ny-inline-style["'][^>]*>\s*<\/style>\s*/i, '');
        var injected = withoutLinks.replace(
          '</head>',
          '<style data-ny-css-inlined="true">' + bundled.replace(/<\/style>/gi, '</s' + 'tyle>') + '</style></head>'
        );
        return injected;
      } catch (e) { throw e; }
    }

    // CSSOM 回退：在 fetch 不可用（如 file:// 或离线）时，从 document.styleSheets 组装核心样式并注入
    async function inlineFromCssomBundle(doc) {
      try {
        var html = String(doc || '');
        
        // 🔒 幂等性保护: 检查CSS是否已被内联
        if (html.indexOf('data-ny-css-inlined="true"') !== -1) {
          console.log('[Export] CSS already inlined (CSSOM), skipping');
          return html;
        }

        function extractWrapperClass(s) {
          var m = String(s).match(/class\s*=\s*["']([^"']*status-preview-wrapper[^"']*)["']/i);
          return m ? m[1].trim() : '';
        }

        function readCssByHint(hint) {
          try {
            var sheets = document.styleSheets || [];
            var key = String(hint || '').toLowerCase();
            for (var i = 0; i < sheets.length; i++) {
              var ss = sheets[i];
              var href = ss && ss.href ? String(ss.href) : '';
              var hl = href.toLowerCase();
              if (!href) continue;
              if (hl.indexOf(key) !== -1 || hl.endsWith(key) || (key && hl.endsWith('/' + key))) {
                try {
                  var rules = ss.cssRules || ss.rules;
                  var buf = [];
                  for (var j = 0; rules && j < rules.length; j++) {
                    var r = rules[j];
                    if (r && r.cssText) buf.push(r.cssText);
                  }
                  var text = buf.join('\n');
                  if (/\S/.test(text)) return text;
                } catch (_se) {}
              }
            }
          } catch (_e) {}
          return '';
        }

        function tryReadTheme(themeName) {
          try {
            var sheets = document.styleSheets || [];
            var firstTheme = '';
            var chosen = '';
            for (var i = 0; i < sheets.length; i++) {
              var ss = sheets[i];
              var href = ss && ss.href ? String(ss.href) : '';
              var hl = href.toLowerCase();
              if (!href) continue;
              if (hl.indexOf('/themes/') !== -1) {
                if (!firstTheme) {
                  try {
                    var rules = ss.cssRules || ss.rules, buf = [];
                    for (var j = 0; rules && j < rules.length; j++) {
                      var r = rules[j]; if (r && r.cssText) buf.push(r.cssText);
                    }
                    firstTheme = buf.join('\n');
                  } catch (_e0) {}
                }
                if (themeName && hl.indexOf(String(themeName).toLowerCase()) !== -1) {
                  try {
                    var rules2 = ss.cssRules || ss.rules, buf2 = [];
                    for (var k = 0; rules2 && k < rules2.length; k++) {
                      var r2 = rules2[k]; if (r2 && r2.cssText) buf2.push(r2.cssText);
                    }
                    chosen = buf2.join('\n');
                    break;
                  } catch (_e1) {}
                }
              }
            }
            return /\S/.test(chosen) ? chosen : (/\S/.test(firstTheme) ? firstTheme : '');
          } catch (_e) { return ''; }
        }

        function readCustomFontCss() {
          try {
            var out = [];
            var links = document.querySelectorAll('link[data-ny-custom-font="true"][href]');
            var hrefs = [];
            links.forEach(function (l) { try { var h = l.getAttribute('href'); if (h) hrefs.push(h); } catch (_e) {} });
            if (hrefs.length === 0) return '';
            var sheets = document.styleSheets || [];
            hrefs.forEach(function (href) {
              var hlow = String(href).toLowerCase();
              for (var i = 0; i < sheets.length; i++) {
                var ss = sheets[i];
                var sh = ss && ss.href ? String(ss.href).toLowerCase() : '';
                if (sh && (sh.indexOf(hlow) !== -1 || sh.endsWith(hlow) || sh.endsWith('/' + hlow))) {
                  try {
                    var rules = ss.cssRules || ss.rules, buf = [];
                    for (var j = 0; rules && j < rules.length; j++) {
                      var r = rules[j]; if (r && r.cssText) buf.push(r.cssText);
                    }
                    if (buf.length) out.push('/* ====== inlined: custom font css ====== */\n/* ' + ss.href + ' */\n' + buf.join('\n'));
                  } catch (_se) {}
                  break;
                }
              }
            });
            return out.join('\n\n');
          } catch (_e) { return ''; }
        }

        var wrapCls = extractWrapperClass(html);
        var themeName = (wrapCls && (wrapCls.match(/theme-[a-z0-9-]+/i) || [])[0]) || '';

        var cssFonts = readCssByHint('ny-ui-fonts.css');
        var cssEffects = readCssByHint('ny-ui-effects.css');
        var cssUi = readCssByHint('ny-ui.css');
        var cssTheme = tryReadTheme(themeName);
        var customCss = readCustomFontCss();

        // 如果 CSSOM 无法读取当前主题/效果文件，则使用内嵌快照兜底，确保“以所选模板为基础”
        if (!/\S/.test(cssTheme)) {
          try { cssTheme = embeddedThemeCss(themeName) || ''; } catch(_e){ cssTheme = cssTheme || ''; }
        }
        if (!/\S/.test(cssEffects)) {
          try { cssEffects = embeddedEffectsCss() || ''; } catch(_e){ cssEffects = cssEffects || ''; }
        }

        // 仅拼接非空片段，避免输出“空节标题”
        var parts = [];
        if (/\S/.test(cssFonts)) {
          parts.push('/* ====== CSSOM: ny-ui-fonts.css (subset,可访问部分) ====== */\n' + cssFonts);
        }
        if (/\S/.test(cssTheme)) {
          parts.push('/* ====== CSSOM: theme (' + (themeName || 'unknown') + ') ====== */\n' + cssTheme);
        }
        if (/\S/.test(cssEffects)) {
          parts.push('/* ====== CSSOM: ny-ui-effects.css ====== */\n' + cssEffects);
        }
        if (/\S/.test(cssUi)) {
          parts.push('/* ====== CSSOM: ny-ui.css ====== */\n' + cssUi);
        }
        if (/\S/.test(customCss)) {
          parts.push(customCss);
        }
        // 移除冗余 essentials，改由“可访问 CSS 片段”提供所需样式，避免重复与未使用规则
        // CSSOM 路径补强：如当前聚合中缺失“区域展开/折叠 + 主体 enter/exit + 循环效果”，注入子集，确保导出与预览一致
        try {
          var __effectsAggC = [cssEffects || '', cssUi || '', cssTheme || ''].join('\n');
          var __hasHdrC = /\.region-(?:expand|collapse)-(?:flip3d|wipe|pop|underline|ripple|glitch)\b/i.test(__effectsAggC);
          var __hasBodyC = /\.(?:region-body-anim|body-(?:enter|exit)-(?:fade|slide-(?:down|up)|zoom-(?:in|out)))\b/i.test(__effectsAggC)
                           && /@keyframes\s+rb(?:FadeIn|FadeOut|SlideDownIn|SlideDownOut|SlideUpIn|SlideUpOut|ZoomIn|ZoomOut|ZoomOutIn|ZoomInOut)\b/i.test(__effectsAggC);
          var __hasLoopC = /\.region-loop-(?:gloss|shimmer|breathe|neon)\b/i.test(__effectsAggC);
          if (!__hasHdrC || !__hasBodyC || !__hasLoopC) {
            var __regionCssSubset =
'/* ====== Region animation subset (CSSOM ensured) ====== */\n' +
'.region-loop-gloss{position:relative;overflow:hidden;}\n' +
'.region-loop-gloss::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,0) 60%);opacity:.4;animation:glossSweep calc(var(--anim-speed,1s)*6) ease-in-out infinite;}\n' +
'.region-loop-shimmer{position:relative;overflow:hidden;}\n' +
'.region-loop-shimmer::after{content:"";position:absolute;inset:-20%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent);transform:translateX(-100%);animation:shimmerShift calc(var(--anim-speed,1s)*2) linear infinite;}\n' +
'.region-loop-breathe{animation:breathe calc(var(--anim-speed,1s)*3) ease-in-out infinite;}\n' +
'.region-loop-neon{animation:neonGlow calc(var(--anim-speed,1s)*3) ease-in-out infinite;}\n' +
'.region-body-anim{will-change:transform,opacity;}\n' +
'.body-enter-fade{animation:rbFadeIn var(--rb-dur,.6s) var(--rb-ease,ease) both;}\n' +
'.body-exit-fade{animation:rbFadeOut var(--rb-dur,.6s) var(--rb-ease,ease) both;}\n' +
'.body-enter-slide-down{animation:rbSlideDownIn var(--rb-dur,.6s) var(--rb-ease,ease) both;}\n' +
'.body-exit-slide-down{animation:rbSlideDownOut var(--rb-dur,.6s) var(--rb-ease,ease) both;}\n' +
'.body-enter-slide-up{animation:rbSlideUpIn var(--rb-dur,.6s) var(--rb-ease,ease) both;}\n' +
'.body-exit-slide-up{animation:rbSlideUpOut var(--rb-dur,.6s) var(--rb-ease,ease) both;}\n' +
'.body-enter-zoom-in{animation:rbZoomIn var(--rb-dur,.6s) var(--rb-ease,ease) both;}\n' +
'.body-exit-zoom-in{animation:rbZoomOut var(--rb-dur,.6s) var(--rb-ease,ease) both;}\n' +
'.body-enter-zoom-out{animation:rbZoomOutIn var(--rb-dur,.6s) var(--rb-ease,ease) both;}\n' +
'.body-exit-zoom-out{animation:rbZoomInOut var(--rb-dur,.6s) var(--rb-ease,ease) both;}\n' +
'.region-expand-flip3d{animation:hdrFlip3dIn var(--exp-dur,.8s) ease both;will-change:transform,opacity;}\n' +
'.region-collapse-flip3d{animation:hdrFlip3dOut var(--exp-dur,.8s) ease both;will-change:transform,opacity;}\n' +
'@keyframes hdrFlip3dIn{from{opacity:0;transform:perspective(600px) rotateX(-12deg) translateY(-4px)}to{opacity:1;transform:perspective(600px) rotateX(0) translateY(0)}}\n' +
'@keyframes hdrFlip3dOut{from{opacity:1;transform:perspective(600px) rotateX(0) translateY(0)}to{opacity:0;transform:perspective(600px) rotateX(12deg) translateY(-4px)}}\n' +
'.region-expand-wipe{animation:hdrWipeIn var(--exp-dur,.8s) ease both;overflow:hidden;}\n' +
'.region-collapse-wipe{animation:hdrWipeOut var(--exp-dur,.8s) ease both;overflow:hidden;}\n' +
'@keyframes hdrWipeIn{from{opacity:0;clip-path:inset(0 100% 0 0)}to{opacity:1;clip-path:inset(0 0 0 0)}}\n' +
'@keyframes hdrWipeOut{from{opacity:1;clip-path:inset(0 0 0 0)}to{opacity:0;clip-path:inset(0 100% 0 0)}}\n' +
'.region-expand-pop{animation:hdrPopIn var(--exp-dur,.8s) ease both;will-change:transform,opacity;}\n' +
'.region-collapse-pop{animation:hdrPopOut var(--exp-dur,.8s) ease both;will-change:transform,opacity;}\n' +
'@keyframes hdrPopIn{from{opacity:.0;transform:scale(calc(1 - .06 * var(--exp-int,.5)))}to{opacity:1;transform:scale(1)}}\n' +
'@keyframes hdrPopOut{from{opacity:1;transform:scale(1)}to{opacity:.0;transform:scale(calc(1 - .06 * var(--exp-int,.5)))}}\n' +
'.region-expand-underline{animation:hdrUnderlineIn var(--exp-dur,.8s) ease both;position:relative;}\n' +
'.region-collapse-underline{animation:hdrUnderlineOut var(--exp-dur,.8s) ease both;position:relative;}\n' +
'@keyframes hdrUnderlineIn{from{opacity:.0}to{opacity:1}}\n' +
'@keyframes hdrUnderlineOut{from{opacity:1}to{opacity:.0}}\n' +
'.region-expand-underline::after,.region-collapse-underline::after{content:"";position:absolute;left:0;right:0;bottom:-4px;height:2px;background:linear-gradient(90deg, rgba(255,255,255,.0), rgba(255,255,255,.35), rgba(255,255,255,.0));transform-origin:left center;}\n' +
'.region-expand-underline::after{animation:hdrULDraw var(--exp-dur,.8s) ease both;}\n' +
'.region-collapse-underline::after{animation:hdrULErase var(--exp-dur,.8s) ease both;}\n' +
'@keyframes hdrULDraw{from{transform:scaleX(.2);opacity:.4}to{transform:scaleX(1);opacity:.9}}\n' +
'@keyframes hdrULErase{from{transform:scaleX(1);opacity:.9}to{transform:scaleX(.2);opacity:.4}}\n' +
'.region-expand-ripple{animation:hdrRippleIn var(--exp-dur,.8s) ease both;}\n' +
'.region-collapse-ripple{animation:hdrRippleOut var(--exp-dur,.8s) ease both;}\n' +
'@keyframes hdrRippleIn{0%{box-shadow:0 0 0 0 rgba(255,255,255,.0)}50%{box-shadow:0 0 calc(6px + 6px * var(--exp-int,.6)) rgba(255,255,255,.25)}100%{box-shadow:0 0 0 0 rgba(255,255,255,.0)}}\n' +
'@keyframes hdrRippleOut{0%{box-shadow:0 0 calc(6px + 6px * var(--exp-int,.6)) rgba(255,255,255,.25)}100%{box-shadow:0 0 0 0 rgba(255,255,255,.0)}}\n' +
'.region-expand-glitch{animation:hdrGlitchIn var(--exp-dur,.8s) steps(6,end) both;}\n' +
'.region-collapse-glitch{animation:hdrGlitchOut var(--exp-dur,.8s) steps(6,end) both;}\n' +
'@keyframes hdrGlitchIn{0%{transform:translate(0,0);opacity:0}30%{transform:translate(-1px,1px);opacity:.6}60%{transform:translate(1px,-1px);opacity:.85}100%{transform:translate(0,0);opacity:1}}\n' +
'@keyframes hdrGlitchOut{0%{transform:translate(0,0);opacity:1}30%{transform:translate(1px,-1px);opacity:.85}60%{transform:translate(-1px,1px);opacity:.6}100%{transform:translate(0,0);opacity:0}}\n' +
'@keyframes rbFadeIn{from{opacity:0}to{opacity:1}}\n' +
'@keyframes rbFadeOut{from{opacity:1}to{opacity:0}}\n' +
'@keyframes rbSlideDownIn{from{opacity:.0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}\n' +
'@keyframes rbSlideDownOut{from{opacity:1;transform:translateY(0)}to{opacity:.0;transform:translateY(-8px)}}\n' +
'@keyframes rbSlideUpIn{from{opacity:.0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}\n' +
'@keyframes rbSlideUpOut{from{opacity:1;transform:translateY(0)}to{opacity:.0;transform:translateY(8px)}}\n' +
'@keyframes rbZoomIn{from{opacity:.0;transform:scale(calc(1 - .06 * var(--rb-int,.5)))}to{opacity:1;transform:scale(1)}}\n' +
'@keyframes rbZoomOut{from{opacity:1;transform:scale(1)}to{opacity:.0;transform:scale(calc(1 - .06 * var(--rb-int,.5)))}}\n' +
'@keyframes rbZoomOutIn{from{opacity:.0;transform:scale(calc(1 + .06 * var(--rb-int,.5)))}to{opacity:1;transform:scale(1)}}\n' +
'@keyframes rbZoomInOut{from{opacity:1;transform:scale(1)}to{opacity:.0;transform:scale(calc(1 + .06 * var(--rb-int,.5)))}}';
            parts.push(__regionCssSubset);
            try { console.warn('[Ny.Export][CSSOM] injected region animation subset'); } catch(_eWarnCssom){}
          } else {
            try { console.log('[Ny.Export][CSSOM] region animation CSS present - no subset injection'); } catch(_eLogCssom){}
          }
        } catch(__regionCssomEx) { try { console.warn('[Ny.Export][CSSOM] region CSS subset inject error', __regionCssomEx); } catch(_e){} }

        try { var __hdrCss = regionHeaderGlassCss(); if (__hdrCss && __hdrCss.replace(/\s+/g,'').length){ parts.push('/* ====== Export: region header glass subset ====== */\n' + __hdrCss); } } catch(__hdrEx){}
        var essentialsCss = "";
/* 将必需样式与可访问片段合并（若文档包含 BoutiqueBitmap9x9，样式顶部加入 @import） */
var __zeoImport = (/\bBoutiqueBitmap9x9\b/.test(html)) ? "@import url('https://fontsapi.zeoseven.com/65/main/result.css');" : '';
/* 导出必需：section2-sizing 子集（含值框尺寸/偏移与长文左对齐），避免在 CSSOM 路径丢失 */
var __essentials = '/* essentials: section2-sizing subset */\n'
  + '.status-preview-wrapper .st-item{margin-left:calc(1% * var(--item-offset-pct, 0));margin-right:calc(1% * var(--item-offset-right-pct, 0));}\n'
  + '.status-preview-wrapper .st-item .st-value{--_vb-base-max:160px;width:clamp(120px,40vw,calc(var(--_vb-base-max) * var(--vb-width-pct, 100) / 100));transform:translateX(calc(1% * var(--vb-offset-pct, 0)));}\n'
  + '.status-preview-wrapper .st-item .st-value.st-text{--_vb-base-max:240px;max-width:clamp(120px,60vw,calc(var(--_vb-base-max) * var(--vb-width-pct, 100) / 100));text-align:right;}\n'
  + '.status-preview-wrapper .st-item .st-value.st-longtext{--_vb-base-max:240px;width:100%;max-width:100%;transform:none;text-align:left;direction:ltr;padding-left:0;padding-right:0;}\n'
  + '.status-preview-wrapper .st-item .st-value:not(.st-longtext){padding-right:1ch;}\n'
  + '/* essentials: page reset */\nhtml,body{margin:0;padding:0;}\n/* essentials: wrapper base */\n'  + '.status-preview-wrapper{position:relative;box-sizing:border-box;}\n'  + '/* essentials: background layers subset */\n'
  + '.status-preview-wrapper .bg-layers{position:absolute;inset:0;z-index:0;pointer-events:none;border-radius:inherit;overflow:hidden;}\n'
  + '.status-preview-wrapper .bg-layer{position:absolute;inset:0;background-position:center;background-size:cover;background-repeat:no-repeat;}\n'
  + '.status-preview-wrapper .bg-components-layer{position:absolute;inset:0;z-index:2;pointer-events:none;}\n'
  + '.status-preview-wrapper .bg-comp{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:auto;user-select:none;-webkit-user-drag:none;}';
var bundled = (__zeoImport ? __zeoImport + '\n' : '') + parts.join('\n\n') + '\n' + __essentials + '\n' + responsiveLayoutCss();
// Ensure collapsed region fold rules present to remove all placeholder space on collapse
bundled += "\n/* collapsed region fold rules */\n.st-region.collapsed > .st-region-body{display:none !important;margin:0 !important;padding:0 !important;}\n.st-region.collapsed{margin-bottom:0 !important;}\n.st-region.collapsed .st-region-header{margin-bottom:0 !important;}";
try { if (bundled.indexOf('.status-preview-wrapper .bg-layers') === -1) { bundled += '\n' + bgLayersSubsetCss(); } } catch(_eBgCssom){}

        var check = bundled.replace(/\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, '').trim();
        if (!/\S/.test(check)) throw new Error('CSSOM 样式为空或不可访问');

        var withoutLinks = html
          .replace(/<link[^>]+href="ny-[^"]+\.css"[^>]*>\s*/g, '')
          .replace(/<link\b[^>]*data-ny-custom-font=["']true["'][^>]*>\s*/gi, '')
          .replace(/<style\s+id=["']ny-inline-style["'][^>]*>\s*<\/style>\s*/i, '');
 
        var injected = withoutLinks.replace(
          '</head>',
          '<style data-ny-css-inlined="true">' + bundled.replace(/<\/style>/gi, '</s' + 'tyle>') + '</style></head>'
        );
        return injected;
      } catch (e) {
        throw e;
      }
    }

    // Inline external ny-* CSS files into a single <style> for standalone export
    async function inlineExternalCss(doc) {
      // STRICT: 无回退。任何失败都直接抛错，由调用方捕获并弹窗
      console.log('[DEBUG inlineExternalCss] Called - starting CSS inlining process');
      console.trace('[DEBUG inlineExternalCss] call stack');
      
      var docStr = String(doc);
      
      // 🔒 幂等性保护: 检查CSS是否已被内联
      // 注意: 保留 ny-live-overrides 块，它是在CSS内联后添加的实时样式覆盖
      if (docStr.indexOf('data-ny-css-inlined="true"') !== -1) {
        console.log('[Export] CSS already inlined, skipping duplicate inlining');
        // 如果文档已包含内联CSS，但可能在此之后添加了 ny-live-overrides
        // 我们需要保留这些新添加的内容，所以直接返回当前文档
        return docStr;
      }

      function extractWrapperClass(html) {
        // 更稳健：匹配 class 属性（含等号与空白），提取包含 status-preview-wrapper 的完整类串
        var m = String(html).match(/class\s*=\s*["']([^"']*status-preview-wrapper[^"']*)["']/i);
        return m ? m[1].trim() : '';
      }
      function __parseFamilyList(str) {
        var out = [];
        (String(str || '')).split(',').forEach(function (raw) {
          var s = raw.trim().replace(/^['"]|['"]$/g, '');
          var low = s.toLowerCase();
          if (!s) return;
          if (/(^|\b)(sans-serif|serif|monospace|system-ui|emoji|ui-sans-serif|ui-serif|ui-monospace|cursive|fantasy)\b/.test(low)) return;
          if (/(segoe ui|tahoma|geneva|verdana|arial|helvetica|times new roman|georgia)\b/.test(low)) return;
          if (out.indexOf(s) === -1) out.push(s);
        });
        return out;
      }
      function __extractUsedFontFamilies(docHtml, cssThemesText) {
        var famSet = new Set();
        var cfg = (Ny && Ny.State && Ny.State.customization) ? Ny.State.customization : {};
        __parseFamilyList(cfg.fontFamily).forEach(function (f) { famSet.add(f); });
        __parseFamilyList(cfg.globalLabelFontFamily).forEach(function (f) { famSet.add(f); });
        __parseFamilyList(cfg.globalValueFontFamily).forEach(function (f) { famSet.add(f); });
        // keep famSet as-is when empty to avoid forcing a default font

        var wrapCls = extractWrapperClass(docHtml);
        var th = (wrapCls && wrapCls.match(/theme-[a-z0-9-]+/i)) ? (wrapCls.match(/theme-[a-z0-9-]+/i)[0]) : '';
        if (th && cssThemesText) {
          var reBlock = new RegExp('\\.' + th.replace(/[-\/\\^$*+?.()|[\\]{}]/g, '\\$&') + '\\s*\\{[\\s\\S]*?\\}', 'i');
          var blk = (cssThemesText.match(reBlock) || [])[0] || '';
          if (blk) {
            var reFF = /font-family\s*:\s*([^;]+);/ig; var m;
            while ((m = reFF.exec(blk)) !== null) {
              __parseFamilyList(m[1]).forEach(function (f) { famSet.add(f); });
            }
          }
        }

        // Enhancement: also scan the generated HTML for inline font-family usage
        try {
          var famSetBefore = new Set(famSet);
          var reInlineFF = /font-family\s*:\s*([^;}{]+);/ig;
          var m2;
          var htmlStr = String(docHtml || '');
          while ((m2 = reInlineFF.exec(htmlStr)) !== null) {
            __parseFamilyList(m2[1]).forEach(function (f) { famSet.add(f); });
          }
          // If the document text mentions BoutiqueBitmap9x9, consider it used
          if (/\bBoutiqueBitmap9x9\b/i.test(htmlStr)) {
            famSet.add('BoutiqueBitmap9x9');
          }
          try { console.log('[DEBUG fonts] usedFamilies(before/after scan HTML):', Array.from(famSetBefore || []), '=>', Array.from(famSet || [])); } catch(_eLog){}
        } catch(_eScan){}

        return famSet;
      }
      function __filterFontsCss(cssText, famSet) {
        var kept = [];
        var re = /@font-face\s*\{[\s\S]*?\}/gi; var m;
        while ((m = re.exec(cssText)) !== null) {
          var block = m[0];
          var fam = '';
          var mm = block.match(/font-family\s*:\s*(['"]?)([^;'"\}]+)\1\s*;/i);
          if (mm && mm[2]) fam = mm[2].trim().replace(/^['"]|['"]$/g, '');
          if (fam && famSet && famSet.has(fam)) kept.push(block);
        }
        return kept.join('\n\n');
      }
      function __filterFontsCssByUsage(cssText, famSet, weightSet, ital) {
        var kept = [];
        var re = /@font-face\s*\{[\s\S]*?\}/gi, m;
        while ((m = re.exec(cssText)) !== null) {
          var block = m[0];
          var fam = '';
          var mm = block.match(/font-family\s*:\s*(['"]?)([^;'"\}]+)\1\s*;/i);
          if (mm && mm[2]) fam = mm[2].trim().replace(/^['"]|['"]$/g,'');
          if (fam && famSet && famSet.has(fam)) {
            var style = (block.match(/font-style\s*:\s*([^;]+);/i) || [,'normal'])[1].trim().toLowerCase();
            var wMatch = block.match(/font-weight\s*:\s*([0-9]{3})(?:\s*;|\s)/i);
            var w = wMatch ? parseInt(wMatch[1],10) : null;
            if (!ital && style === 'italic') continue;
            if (w && weightSet && weightSet.size && !weightSet.has(w)) continue;
            kept.push(block);
          }
        }
        return kept.join('\n\n');
      }
      function __buildGoogleFontsUrl(fam, weightSet, ital) {
        var famParam = encodeURIComponent(fam).replace(/%20/g,'+');
        var ws = Array.from(weightSet || []).filter(function(n){return isFinite(n);}).sort(function(a,b){return a-b;});
        if (ws.length === 0) ws = [400,500,700];
        if (ital) {
          var combos = [];
          ws.forEach(function(w){ combos.push('0,'+w); });
          ws.forEach(function(w){ combos.push('1,'+w); });
          return 'https://fonts.googleapis.com/css2?family=' + famParam + ':ital,wght@' + combos.join(';') + '&display=swap';
        }
        return 'https://fonts.googleapis.com/css2?family=' + famParam + ':wght@' + ws.join(';') + '&display=swap';
      }
      function __cssContainsFamily(cssText, fam){
        var re = new RegExp('@font-face[\\s\\S]*font-family\\s*:\\s*[\'"]?'+ fam.replace(/[-\/\\^$*+?.()|[\]{}]/g,'\\$&') +'[\'"]?\\s*;', 'i');
        return re.test(cssText || '');
      }

      async function fetchTextStrict(url) {
        console.log('[DEBUG fetchTextStrict] Attempting to fetch:', url);
        try {
          var res = await fetch(url);
          if (!res.ok) {
            var err = new Error('CSS 获取失败: ' + url + ' HTTP ' + res.status);
            console.error('[DEBUG fetchTextStrict] HTTP error:', err);
            throw err;
          }
          console.log('[DEBUG fetchTextStrict] Fetch successful for:', url);
          return await res.text();
        } catch (e) {
          console.error('[DEBUG fetchTextStrict] Fetch exception for:', url, e);
          throw e;
        }
      }
      // 尝试从 DOM 的 CSSOM 读取同源样式（离线/file:// 场景下无法 fetch 时启用）
      function getCssFromDom(hint) {
        console.log('[DEBUG getCssFromDom] Looking for:', hint);
        try {
          var sheets = document.styleSheets || [];
          console.log('[DEBUG getCssFromDom] Total stylesheets:', sheets.length);
          var key = String(hint || '').toLowerCase();
          for (var i = 0; i < sheets.length; i++) {
            var ss = sheets[i];
            var href = ss && ss.href ? String(ss.href) : '';
            var hl = href.toLowerCase();
            console.log('[DEBUG getCssFromDom] Checking sheet', i, ':', href);
            if (!href) continue;
            if (hl.indexOf(key) !== -1 || hl.endsWith(key)) {
              console.log('[DEBUG getCssFromDom] Found matching sheet:', href);
              try {
                var rules = ss.cssRules || ss.rules;
                var buf = [];
                for (var j = 0; rules && j < rules.length; j++) {
                  var r = rules[j];
                  if (r && r.cssText) buf.push(r.cssText);
                }
                var text = buf.join('\n');
                console.log('[DEBUG getCssFromDom] Extracted text length:', text.length);
                if (/\S/.test(text)) {
                  console.log('[DEBUG getCssFromDom] SUCCESS - returning CSS from DOM');
                  return { text: text, href: href };
                }
              } catch (_se) {
                console.warn('[DEBUG getCssFromDom] Failed to read rules from:', href, _se);
                // 可能跨域或安全限制，跳过
              }
            }
          }
          console.log('[DEBUG getCssFromDom] No matching sheet found');
        } catch (_e) {
          console.error('[DEBUG getCssFromDom] Error:', _e);
        }
        return { text: '', href: '' };
      }
      async function getCssTextPreferFetch(hrefOrHint) {
        // 调试：记录调用栈，找出是谁触发了CSS加载
        console.log('[DEBUG] getCssTextPreferFetch called for:', hrefOrHint);
        console.trace('[DEBUG] call stack');
        
        // 优先尝试从DOM读取（适用于file://协议），避免CORS错误
        try {
          var dom = getCssFromDom(hrefOrHint);
          if (/\S/.test(dom.text)) {
            console.log('[DEBUG] Successfully loaded from DOM:', hrefOrHint);
            return dom;
          }
        } catch (_de) {
          console.warn('[DEBUG] DOM load failed for:', hrefOrHint, _de);
        }
        
        // DOM读取失败，尝试fetch（适用于http://协议）
        try {
          console.log('[DEBUG] Attempting fetch for:', hrefOrHint);
          var t = await fetchTextStrict(hrefOrHint);
          console.log('[DEBUG] Fetch succeeded for:', hrefOrHint);
          return { text: t, href: toAbsUrl(hrefOrHint) };
        } catch (_fe) {
          console.error('[DEBUG] Fetch failed for:', hrefOrHint, _fe);
          throw _fe;
        }
      }
      async function fetchArrayBufferStrict(url) {
        var res = await fetch(url);
        if (!res.ok) throw new Error('资源获取失败: ' + url + ' HTTP ' + res.status);
        return await res.arrayBuffer();
      }
      function ab2b64(buf) {
        var bin = '';
        var bytes = new Uint8Array(buf);
        for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        return btoa(bin);
      }
      function guessMimeByExt(u) {
        var lc = (u || '').toLowerCase();
        if (lc.endsWith('.woff2')) return 'font/woff2';
        if (lc.endsWith('.woff')) return 'font/woff';
        if (lc.endsWith('.ttf')) return 'font/ttf';
        if (lc.endsWith('.otf')) return 'font/otf';
        if (lc.endsWith('.svg')) return 'image/svg+xml';
        if (lc.endsWith('.png')) return 'image/png';
        if (lc.endsWith('.jpg') || lc.endsWith('.jpeg')) return 'image/jpeg';
        if (lc.endsWith('.gif')) return 'image/gif';
        return 'application/octet-stream';
      }
      function toAbsUrl(ref, base) {
        return new URL(ref, base || window.location.href).href;
      }
      async function toDataUrlStrict(absUrl) {
        var buf = await fetchArrayBufferStrict(absUrl);
        var mime = guessMimeByExt(absUrl);
        return 'data:' + mime + ';base64,' + ab2b64(buf);
      }
      async function inlineUrlsStrict(css, baseUrl) {
        var re = /url\(([^)]+)\)/g;
        var out = '';
        var lastIdx = 0, m;
        while ((m = re.exec(css)) !== null) {
          out += css.slice(lastIdx, m.index);
          var raw = m[1].trim().replace(/^['"]|['"]$/g, '');
          if (/^(data:|about:|chrome:|edge:)/i.test(raw)) {
            out += 'url(' + m[1] + ')';
          } else {
            var abs = toAbsUrl(raw, baseUrl);
            // 仅对图片资源内联；字体资源保持为外链，避免大量 .woff2 下载导致卡顿
            if (/\.(png|jpe?g|gif|webp|svg)(\?|#|$)/i.test(abs)) {
              var dataUrl = await toDataUrlStrict(abs);
              out += 'url(\'' + dataUrl + '\')';
            } else {
              out += 'url(\'' + abs + '\')';
            }
          }
          lastIdx = re.lastIndex;
        }
        out += css.slice(lastIdx);
        return out;
      }
      async function resolveImportsStrict(css, baseUrl) {
        var re = /@import\s+(?:url\(([^)]+)\)|['"]([^'"]+)['"])\s*;/g;
        var out = '';
        var last = 0, m;
        while ((m = re.exec(css)) !== null) {
          out += css.slice(last, m.index);
          var ref = (m[1] || m[2] || '').trim().replace(/^['"]|['"]$/g, '');
          var abs = toAbsUrl(ref, baseUrl);
          var subCss = await fetchTextStrict(abs);
          subCss = await resolveImportsStrict(subCss, abs);
          subCss = await inlineUrlsStrict(subCss, abs);
          out += '\n/* inlined import: ' + abs + ' */\n' + subCss + '\n/* end import */\n';
          last = re.lastIndex;
        }
        out += css.slice(last);
        return out;
      }

      // Load core ny-* styles (STRICT) + 精简器（仅保留"用到"的片段）
      // 字体CSS：仅保留实际使用的字体，避免导入全部字体造成冗余
      var F = await getCssTextPreferFetch('ny-ui-fonts.css');
      var cssFontsRaw = F.text;
      // 先提取使用的字体家族
      var wrapperCls = extractWrapperClass(docStr);
      var themeName = (wrapperCls && (wrapperCls.match(/theme-[a-z0-9-]+/i)||[])[0]) || '';
      
      // 提前读取主题CSS用于字体提取
      var cssThemePicked = '';
      try {
        async function fetchCurrentThemeCss(themeName) {
          try {
            var TI = await getCssTextPreferFetch('ny-themes.css');
            var themesIndex = TI.text;
            var themesIndexBase = TI.href || toAbsUrl('ny-themes.css');
            var importRe = /@import\s+["']([^"']+)["'];/g, m;
            var chosen = null;
            while ((m = importRe.exec(themesIndex)) !== null) {
              var href = (m[1] || '').trim();
              if (!href) continue;
              if (themeName && href.indexOf(themeName) !== -1) { chosen = href; break; }
            }
            if (!chosen && importRe.lastIndex > 0) {
              importRe.lastIndex = 0;
              var first = importRe.exec(themesIndex);
              if (first && first[1]) chosen = first[1].trim();
            }
            if (!chosen) return '';
            var abs = toAbsUrl(chosen, themesIndexBase);
            var Tfile;
            try { Tfile = await getCssTextPreferFetch(abs); } catch (_feTheme) { Tfile = await getCssTextPreferFetch(chosen); }
            var tcss = Tfile.text;
            var tbase = Tfile.href || abs;
            tcss = await inlineUrlsStrict(tcss, tbase);
            return tcss;
          } catch(_e) { return ''; }
        }
        cssThemePicked = await fetchCurrentThemeCss(themeName);
      } catch(_eTheme) { cssThemePicked = ''; }
      
      var usedFamilies = __extractUsedFontFamilies(docStr, cssThemePicked);
      // DOM hint: 若预览已插入 data-ny-custom-font 的 fontsapi 链接，则视为已选择 BoutiqueBitmap9x9
      try {
        var __nyZeo = (document && document.querySelector)
          ? document.querySelector('link[rel="stylesheet"][data-ny-custom-font="true"][href*="fontsapi.zeoseven.com/65/main/result.css"]')
          : null;
        if (__nyZeo) {
          usedFamilies.add('BoutiqueBitmap9x9');
          try { console.log('[DEBUG fonts] DOM custom font link detected -> BoutiqueBitmap9x9'); } catch(_eLog){}
        }
      } catch(_eDOM){}
      
      // 过滤字体CSS，只保留使用的字体的@import
      console.log('[DEBUG] Used font families:', Array.from(usedFamilies || []));
      var cssFonts = '';
      if (usedFamilies && usedFamilies.size > 0) {
        var lines = cssFontsRaw.split('\n');
        var keptLines = [];
        var boutiqueSelected = (usedFamilies && usedFamilies.has('BoutiqueBitmap9x9'));
        for (var li = 0; li < lines.length; li++) {
          var line = lines[li];
          // 非@import行直接保留(如注释)
          if (!/@import/i.test(line)) {
            keptLines.push(line);
            continue;
          }
          // 检查这行@import是否包含我们使用的字体
          var shouldKeep = false;
          usedFamilies.forEach(function(fam) {
            // 更严格的匹配:检查family=参数或url中的字体名
            if (line.indexOf(fam) !== -1 || line.indexOf(encodeURIComponent(fam)) !== -1) {
              shouldKeep = true;
            }
          });
          // 特别保留：当选择了 BoutiqueBitmap9x9 时，确保保留 fontsapi 的 result.css 导入行
          if (!shouldKeep && boutiqueSelected && line.toLowerCase().indexOf('fontsapi.zeoseven.com/65/main/result.css') !== -1) {
            shouldKeep = true;
            try { console.log('[DEBUG fonts] Preserving fontsapi import for BoutiqueBitmap9x9:', line.substring(0, 120)); } catch(_eLog){}
          }
          if (shouldKeep) {
            console.log('[DEBUG] Keeping font import:', line.substring(0, 80));
            keptLines.push(line);
          } else {
            console.log('[DEBUG] Filtering out font import:', line.substring(0, 80));
          }
        }
        cssFonts = keptLines.join('\n');
      } else {
        // ⚠️ 如果没有提取到字体,返回空而非全部,避免冗余
        console.warn('[DEBUG] No used families detected, returning empty font CSS');
        cssFonts = '/* No custom fonts detected in usage */';
      }
  
      // Effects CSS: include full to preserve FX layers and animations
      var E = await getCssTextPreferFetch('ny-ui-effects.css');
      var cssEffects = E.text;
      cssEffects = await inlineUrlsStrict(cssEffects, E.href || toAbsUrl('ny-ui-effects.css'));
      // 当 effects 无法获取时，使用内嵌快照，避免仅输出 essentials
      if (!/\S/.test(cssEffects)) {
        try { cssEffects = embeddedEffectsCss() || ''; } catch(_e){}
      }
      // 精剪 effects：仅保留当前快照实际用到的规则
      cssEffects = filterCssTopLevel(cssEffects, buildUiSelectorPredicate());
  
      // 解析当前主题名（来自 wrapper 类）
      var wrapperCls = extractWrapperClass(docStr);
      var themeName = (wrapperCls && (wrapperCls.match(/theme-[a-z0-9-]+/i)||[])[0]) || '';
      // 根据当前快照提取实际使用到的样式标记，用于精剪 CSS
      var usedPercent = (wrapperCls && (wrapperCls.match(/percent-style-([a-z0-9-]+)/i) || [,'center']))[1];
      var animClasses = (wrapperCls && (wrapperCls.match(/\banim-[a-z0-9-]+\b/gi) || [])) || [];
      var pfClasses = (docStr.match(/\bpf-(?:anim-grow|glow|striped|glass)\b/gi) || []);
      var hasTwoCol = /\blayout-two-column\b/i.test(wrapperCls || '');
      var hasRatio = /\bratio-layout\b/i.test(wrapperCls || '');
      
      // 使用前面已经获取的主题CSS，避免重复获取
      // cssThemePicked 已在前面定义
  
      // 过滤器：仅保留导出组件相关的选择器
      function filterCssTopLevel(cssText, selectorPredicate) {
        var css = String(cssText || '');
        var out = [];
        var i = 0, n = css.length, depth = 0, start = 0, head = '';
        function skipComment(pos){
          if (css[pos] === '/' && css[pos+1] === '*') {
            var end = css.indexOf('*/', pos+2);
            return end === -1 ? n : end+2;
          }
          return pos;
        }
        while (i < n) {
          i = skipComment(i);
          if (i >= n) break;
          var ch = css[i];
          if (/\s/.test(ch)) { i++; continue; }
          if (css.slice(i, i+7).toLowerCase() === '@media ') {
            // @media block
            var atStart = i;
            var brace = css.indexOf('{', i);
            if (brace === -1) break;
            var header = css.slice(i, brace+1);
            i = brace+1; depth = 1; start = i;
            while (i < n && depth > 0) {
              i = skipComment(i);
              var c = css[i++];
              if (c === '{') depth++;
              else if (c === '}') depth--;
            }
            var body = css.slice(start, i-1);
            var filteredBody = filterCssTopLevel(body, selectorPredicate);
            if (/\S/.test(filteredBody)) {
              out.push(header + filteredBody + '}');
            }
          } else if (css.slice(i, i+10).toLowerCase().startsWith('@keyframes') || css.slice(i, i+9).toLowerCase().startsWith('@-webkit-') && css.slice(i, i+19).toLowerCase().indexOf('keyframes') !== -1) {
            // @keyframes xxx { ... } —— 暂存，稍后按引用补齐
            var atStart2 = i;
            var brace2 = css.indexOf('{', i);
            if (brace2 === -1) break;
            i = brace2+1; depth = 1; start = i;
            while (i < n && depth > 0) {
              i = skipComment(i);
              var c2 = css[i++];
              if (c2 === '{') depth++;
              else if (c2 === '}') depth--;
            }
            var block = css.slice(atStart2, i);
            out.push('/*__KEYFRAME__*/' + block); // 先保留，之后根据引用裁剪
          } else if (css[i] === '@') {
            // 其他 at-rule，整体保守丢弃（如 @font-face 不在这里处理）
            var brace3 = css.indexOf('{', i);
            if (brace3 === -1) { var semi = css.indexOf(';', i); i = semi === -1 ? n : semi+1; }
            else {
              i = brace3+1; depth = 1;
              while (i < n && depth > 0) {
                i = skipComment(i);
                var c3 = css[i++];
                if (c3 === '{') depth++;
                else if (c3 === '}') depth--;
              }
            }
          } else {
            // 普通规则集：selector { decls }
            var selEnd = css.indexOf('{', i);
            if (selEnd === -1) break;
            var sel = css.slice(i, selEnd).trim();
            i = selEnd+1; depth = 1; start = i;
            while (i < n && depth > 0) {
              i = skipComment(i);
              var c4 = css[i++];
              if (c4 === '{') depth++;
              else if (c4 === '}') depth--;
            }
            var decls = css.slice(start, i-1);
            if (selectorPredicate(sel)) {
              out.push(sel + '{' + decls + '}');
            }
          }
        }
        return out.join('\n');
      }
      function buildUiSelectorPredicate() {
        // 仅保留当前快照实际用到的选择器，避免冗余
        var esc = function(s){ return String(s||'').replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'); };
        var parts = [
          '(^\\s*:root\\b)',
          '(^\\s*html\\b)',
          '(^\\s*body\\b)',
          '(#ny-status)',
          '(\\.' + esc('status-preview-wrapper') + '\\b)',
          '(\\.st-[a-z-]+\\b)',
          '(\\.' + esc(themeName || '') + '\\b)'
        ];
        // 百分比位置：仅保留当前使用的风格
        if (usedPercent) parts.push('(\\.percent-style-' + esc(usedPercent) + '\\b)');
        // 双列/比例布局：按实际使用保留
        if (hasTwoCol) parts.push('(\\.layout-two-column\\b)');
        if (hasRatio) parts.push('(\\.ratio-layout\\b)');
        // 进度条风格/动画：按实际使用保留
        (pfClasses || []).forEach(function(c){ parts.push('(\\.' + esc(c) + '\\b)'); });
        // 进入/循环动画类：按实际使用保留
        (animClasses || []).forEach(function(c){ parts.push('(\\.' + esc(c) + '\\b)'); });
        // 背景多层/组件容器：如有则保留
        parts.push('(\\.bg-(?:layers|components-layer|comp)\\b)');
        // 🔒 FIX: 保留粒子叠加层与其子元素（否则 HTTP 导出路径会丢失 .fx-* 样式，导致动画效果消失）
        parts.push('(\\.fx-(?:layer|stars|sparkles|petals)\\b)');
        parts.push('(\\.fx-star\\b)');
        parts.push('(\\.fx-sparkle\\b)');
        parts.push('(\\.fx-petal\\b)');
        // 新增：保留“区域体/头部”相关动效与头部美化类
        parts.push('(\\.region-body-anim\\b)');
        parts.push('(\\.body-(?:enter|exit)-(?:fade|slide-down|slide-up|zoom-in|zoom-out)\\b)');
        parts.push('(\\.region-loop-(?:gloss|shimmer|breathe|neon)\\b)');
        // 新增：保留区域头部类 与 头部展开/折叠动画类 + 玻璃效果/图标旋转
        parts.push('(\\.region-(?:expand|collapse)-(?:flip3d|wipe|pop|underline|ripple|glitch)\\b)');
        parts.push('(\\.st-region-header\\b)');
        parts.push('(\\.hdr-mode-glass\\b)');
        parts.push('(\\.st-region-toggle\\b)');
        parts.push('(\\.st-region\\b)');
        var reNeeded = new RegExp(parts.join('|'), 'i');
        return function (sel) { return reNeeded.test(sel || ''); };
      }
      function buildThemeSelectorPredicate(themeName) {
        if (!themeName) return function(){ return false; };
        var esc = themeName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        var re = new RegExp('\\.' + esc + '\\b', 'i');
        return function (sel) { return re.test(sel || ''); };
      }
      function collectAnimationNames(cssText) {
        var names = new Set();
        var re1 = /animation\s*:\s*([^;{}]+)/ig, m1;
        while ((m1 = re1.exec(cssText)) !== null) {
          var part = m1[1];
          // 可能包含多个，用空格/逗号分割再过滤常见时长/函数
          part.split(/[,\s]+/).forEach(function(tok){
            tok = tok.trim();
            if (!tok) return;
            if (/^(infinite|linear|ease|ease-in|ease-out|ease-in-out|both|forwards|backwards|alternate|reverse|normal|running|paused|initial|inherit|unset)$/i.test(tok)) return;
            if (/^[\d.]+m?s$/.test(tok)) return;
            if (/^\d+$/.test(tok)) return;
            // 过滤延迟/次数等
            if (/^calc\(/i.test(tok)) return;
            names.add(tok);
          });
        }
        var re2 = /animation-name\s*:\s*([^;{}]+)/ig, m2;
        while ((m2 = re2.exec(cssText)) !== null) {
          m2[1].split(/[,\s]+/).forEach(function(tok){
            tok = tok.trim(); if (tok) names.add(tok);
          });
        }
        return names;
      }
      function extractAllKeyframes(cssText) {
        var out = [];
        var re = /@(?:-webkit-)?keyframes\s+[a-zA-Z0-9_-]+\s*\{[\s\S]*?\}/g, m;
        while ((m = re.exec(cssText)) !== null) out.push(m[0]);
        return out.join('\n');
      }
      function pickKeyframes(cssText, usedNames) {
        if (!usedNames || !usedNames.size) return '';
        var out = [];
        var re = /@(?:-webkit-)?keyframes\s+([a-zA-Z0-9_-]+)\s*\{[\s\S]*?\}/g, m;
        while ((m = re.exec(cssText)) !== null) {
          var name = m[1];
          if (usedNames.has(name)) out.push(m[0]);
        }
        return out.join('\n');
      }
  
      // 处理主题 CSS：为保证与预览一致，包含当前主题文件的完整内容（若不可获取则回退到内嵌主题快照）
      var cssThemeFiltered = cssThemePicked;
      try {
        if (!cssThemeFiltered || !/\S/.test(cssThemeFiltered)) {
          cssThemeFiltered = embeddedThemeCss(themeName) || '';
        }
      } catch(_e) { cssThemeFiltered = cssThemeFiltered || ''; }
  
      // 🔒 FIX: 完全跳过 ny-ui.css 的嵌入
      // ny-ui.css 是应用程序UI框架样式,不应该出现在导出的独立HTML中
      // 导出的HTML只需要主题CSS和效果CSS即可正常显示
      console.log('[DEBUG] Skipping ny-ui.css embedding (application UI framework, not needed in exports)');
      var cssUiFiltered = ''; // 强制为空,不加载ny-ui.css

      // Custom font CSS (STRICT)
      var customFontUrlsSet = new Set();
      var linkRe = /<link\b[^>]*data-ny-custom-font=["']true["'][^>]*>/gi, lm;
      while ((lm = linkRe.exec(docStr)) !== null) {
        var tag = lm[0];
        var hrefMatch = tag.match(/href=["']([^"']+)["']/i);
        if (hrefMatch && hrefMatch[1]) customFontUrlsSet.add(toAbsUrl(hrefMatch[1]));
      }
      try {
        var cf = (Ny && Ny.State && Ny.State.customization && Array.isArray(Ny.State.customization.customFonts))
          ? Ny.State.customization.customFonts : [];
        cf.forEach(function (f) {
          var href = (f && (f.url || f.href)) ? String(f.url || f.href).trim() : '';
          if (href) customFontUrlsSet.add(toAbsUrl(href));
        });
      } catch(_e){}

      var customCssParts = [];
      var customArr = Array.from(customFontUrlsSet);
      for (var i = 0; i < customArr.length; i++) {
        var href = customArr[i];
        try {
          var cfFetch = await getCssTextPreferFetch(href);
          var ccss = cfFetch.text;
          // 自定义字体CSS：保留@import和url()外链，不内联字体文件
          // ccss = await resolveImportsStrict(ccss, cfFetch.href || href);
          // ccss = await inlineUrlsStrict(ccss, cfFetch.href || href);
          customCssParts.push('/* ====== inlined: custom font css ====== */\n/* ' + href + ' */\n' + ccss);
        } catch (_ce) {
          try { console.warn('[Ny.Export] skip custom font css (unavailable):', href, _ce); } catch (_e) {}
        }
      }
      var customCss = customCssParts.join('\n\n');

      // Fonts filtering by actual usage and fetching missing Google families (STRICT)
      // 使用已选主题 css 进行字体家族提取，避免依赖聚合文件
      var usedFamilies = __extractUsedFontFamilies(docStr, cssThemeFiltered);
      // DOM hint: 若预览已插入 data-ny-custom-font 的 fontsapi 链接，则视为已选择 BoutiqueBitmap9x9
      try {
        var __nyZeo2 = (document && document.querySelector)
          ? document.querySelector('link[rel="stylesheet"][data-ny-custom-font="true"][href*="fontsapi.zeoseven.com/65/main/result.css"]')
          : null;
        if (__nyZeo2) {
          usedFamilies.add('BoutiqueBitmap9x9');
          try { console.log('[DEBUG fonts] DOM custom font link detected (phase2) -> BoutiqueBitmap9x9'); } catch(_eLog2){}
        }
      } catch(_eDOM2){}
      var cfgW = (Ny && Ny.State && Ny.State.customization) ? Ny.State.customization : {};
      var weights = new Set();
      function addW(v){ var n = parseInt(v,10); if (isFinite(n)) weights.add(n); }
      addW(cfgW.titleWeight || 500);
      addW(cfgW.globalLabelWeight || 500);
      addW(cfgW.globalValueWeight || 600);
      [400, 500, 600, 700].forEach(addW);
      var italicsNeeded = !!(cfgW.titleItalic || cfgW.globalLabelItalic || cfgW.globalValueItalic);

      // 若使用到了 BoutiqueBitmap9x9，则在导出样式块顶部追加 @import（部分宿主不解析 <link>）
      var __needBoutiqueImport = (usedFamilies && usedFamilies.has('BoutiqueBitmap9x9'));
      var __zeoImport = __needBoutiqueImport ? "@import url('https://fontsapi.zeoseven.com/65/main/result.css');" : '';
      // 运行时字体引入兜底：当预抓取 Google Fonts 失败时，把其 @import 挂到导出样式顶部
      var __gfImports = [];
      // 运行时字体链接兜底：为不能内联的字体族添加 <link rel="stylesheet">（避免某些宿主屏蔽 @import）
      var __gfLinks = [];

      if (usedFamilies && usedFamilies.size > 0) {
        var missing = [];
        usedFamilies.forEach(function(f){ if (!__cssContainsFamily(cssFonts, f)) missing.push(f); });
        for (var mi=0; mi<missing.length; mi++){
          var fam = missing[mi];
          var url = __buildGoogleFontsUrl(fam, weights, italicsNeeded);
          if (!url) {
            try { console.warn('[Ny.Export] skip Google Fonts (url build failed):', fam); } catch(_e){}
            continue;
          }
          try {
            // 不再内联Google Fonts的字体文件，直接使用@import让浏览器加载
            // var gfCss = await fetchTextStrict(url);
            // gfCss = await inlineUrlsStrict(gfCss, url);
            // cssFonts += '\n/* ====== inlined: google fonts ['+ fam +'] ====== */\n' + gfCss + '\n';
            // 改为直接添加@import语句
            __gfImports.push(url);
          } catch (gfe) {
            // 在中国大陆/离线环境，访问 fonts.googleapis.com 往往失败；
            // 改为在最终样式顶部追加对应的 @import，由浏览器在运行时加载，既避免卡顿又保证字体跟随。
            try { console.warn('[Ny.Export] skip Google Fonts fetch (unavailable):', fam, gfe); } catch(_e){}
            try { if (url) __gfImports.push(url); } catch(_p){}
            // 同时追加 <link rel="stylesheet">，以适配部分宿主对 @import 的限制
            try { if (url) __gfLinks.push(url); } catch(_p2){}
            continue;
          }
        }
        // 避免过滤后丢失全部 @font-face：保存原始并在空结果时回退
        var cssFontsOriginal = cssFonts;
        cssFonts = __filterFontsCss(cssFonts, usedFamilies);
        if (!/\S/.test(cssFonts)) { cssFonts = cssFontsOriginal; }
        var cssFontsAfterUsage = __filterFontsCssByUsage(cssFonts, usedFamilies, weights, italicsNeeded);
        if (/\S/.test(cssFontsAfterUsage)) { cssFonts = cssFontsAfterUsage; }
      }

      // Bundle and validate
      // 仅拼接非空片段，避免“空节标题”，并标注子集信息
      var partsEx = [];
      if (/\S/.test(cssFonts)) {
        partsEx.push('/* ====== inlined: ny-ui-fonts.css (subset) ====== */\n' + cssFonts);
      }
      if (/\S/.test(cssThemeFiltered)) {
        partsEx.push('/* ====== inlined: theme (' + (themeName || 'unknown') + ') ====== */\n' + cssThemeFiltered);
      }
      if (/\S/.test(cssEffects)) {
        partsEx.push('/* ====== inlined: ny-ui-effects.css (full) ====== */\n' + cssEffects);
      }
      if (/\S/.test(cssUiFiltered)) {
        partsEx.push('/* ====== inlined: ny-ui.css (subset) ====== */\n' + cssUiFiltered);
      }
      if (/\S/.test(customCss)) {
        partsEx.push(customCss);
      }
      // 如果核心片段仍为空，则强制引入内嵌主题/特效，避免仅剩 essentials
      if (partsEx.length === 0) {
        try {
          if (!/\S/.test(cssThemeFiltered)) { cssThemeFiltered = embeddedThemeCss(themeName) || ''; }
          if (!/\S/.test(cssEffects)) { cssEffects = embeddedEffectsCss() || ''; }
          if (/\S/.test(cssThemeFiltered)) {
            partsEx.push('/* ====== embedded: theme (' + (themeName || 'unknown') + ') ====== */\n' + cssThemeFiltered);
          }
          if (/\S/.test(cssEffects)) {
            partsEx.push('/* ====== embedded: ny-ui-effects.css ====== */\n' + cssEffects);
          }
        } catch(__embedEx){}
      }

      // 区域动画CSS子集检测与注入（确保导出与预览一致）
      // 诊断日志：若 ny-ui-effects.css 中缺少“区域展开/折叠 + 区域体进入/退出 + 循环效果”规则，则注入子集。
      try {
        var __effectsAgg = [cssEffects || '', cssUiFiltered || '', cssThemeFiltered || ''].join('\n');
        var __hasHdr = /\.region-(?:expand|collapse)-(?:flip3d|wipe|pop|underline|ripple|glitch)\b/i.test(__effectsAgg);
        var __hasBody = /\.(?:region-body-anim|body-(?:enter|exit)-(?:fade|slide-(?:down|up)|zoom-(?:in|out)))\b/i.test(__effectsAgg)
                        && /@keyframes\s+rb(?:FadeIn|FadeOut|SlideDownIn|SlideDownOut|SlideUpIn|SlideUpOut|ZoomIn|ZoomOut|ZoomOutIn|ZoomInOut)\b/i.test(__effectsAgg);
        var __hasLoop = /\.region-loop-(?:gloss|shimmer|breathe|neon)\b/i.test(__effectsAgg);
        try { console.log('[Ny.Export] region CSS detection', { hasHeader: __hasHdr, hasBody: __hasBody, hasLoop: __hasLoop }); } catch(_eLog){}

        if (!__hasHdr || !__hasBody || !__hasLoop) {
          var __regionCssSubset =
'/* ====== Region animation subset (export ensured) ====== */\n' +
'.region-loop-gloss{position:relative;overflow:hidden;}\n' +
'.region-loop-gloss::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,0) 60%);opacity:.4;animation:glossSweep calc(var(--anim-speed,1s)*6) ease-in-out infinite;}\n' +
'.region-loop-shimmer{position:relative;overflow:hidden;}\n' +
'.region-loop-shimmer::after{content:"";position:absolute;inset:-20%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent);transform:translateX(-100%);animation:shimmerShift calc(var(--anim-speed,1s)*2) linear infinite;}\n' +
'.region-loop-breathe{animation:breathe calc(var(--anim-speed,1s)*3) ease-in-out infinite;}\n' +
'.region-loop-neon{animation:neonGlow calc(var(--anim-speed,1s)*3) ease-in-out infinite;}\n' +
'.region-body-anim{will-change:transform,opacity;}\n' +
'.body-enter-fade{animation:rbFadeIn var(--rb-dur,.6s) var(--rb-ease,ease) both;}\n' +
'.body-exit-fade{animation:rbFadeOut var(--rb-dur,.6s) var(--rb-ease,ease) both;}\n' +
'.body-enter-slide-down{animation:rbSlideDownIn var(--rb-dur,.6s) var(--rb-ease,ease) both;}\n' +
'.body-exit-slide-down{animation:rbSlideDownOut var(--rb-dur,.6s) var(--rb-ease,ease) both;}\n' +
'.body-enter-slide-up{animation:rbSlideUpIn var(--rb-dur,.6s) var(--rb-ease,ease) both;}\n' +
'.body-exit-slide-up{animation:rbSlideUpOut var(--rb-dur,.6s) var(--rb-ease,ease) both;}\n' +
'.body-enter-zoom-in{animation:rbZoomIn var(--rb-dur,.6s) var(--rb-ease,ease) both;}\n' +
'.body-exit-zoom-in{animation:rbZoomOut var(--rb-dur,.6s) var(--rb-ease,ease) both;}\n' +
'.body-enter-zoom-out{animation:rbZoomOutIn var(--rb-dur,.6s) var(--rb-ease,ease) both;}\n' +
'.body-exit-zoom-out{animation:rbZoomInOut var(--rb-dur,.6s) var(--rb-ease,ease) both;}\n' +
'.region-expand-flip3d{animation:hdrFlip3dIn var(--exp-dur,.8s) ease both;will-change:transform,opacity;}\n' +
'.region-collapse-flip3d{animation:hdrFlip3dOut var(--exp-dur,.8s) ease both;will-change:transform,opacity;}\n' +
'@keyframes hdrFlip3dIn{from{opacity:0;transform:perspective(600px) rotateX(-12deg) translateY(-4px)}to{opacity:1;transform:perspective(600px) rotateX(0) translateY(0)}}\n' +
'@keyframes hdrFlip3dOut{from{opacity:1;transform:perspective(600px) rotateX(0) translateY(0)}to{opacity:0;transform:perspective(600px) rotateX(12deg) translateY(-4px)}}\n' +
'.region-expand-wipe{animation:hdrWipeIn var(--exp-dur,.8s) ease both;overflow:hidden;}\n' +
'.region-collapse-wipe{animation:hdrWipeOut var(--exp-dur,.8s) ease both;overflow:hidden;}\n' +
'@keyframes hdrWipeIn{from{opacity:0;clip-path:inset(0 100% 0 0)}to{opacity:1;clip-path:inset(0 0 0 0)}}\n' +
'@keyframes hdrWipeOut{from{opacity:1;clip-path:inset(0 0 0 0)}to{opacity:0;clip-path:inset(0 100% 0 0)}}\n' +
'.region-expand-pop{animation:hdrPopIn var(--exp-dur,.8s) ease both;will-change:transform,opacity;}\n' +
'.region-collapse-pop{animation:hdrPopOut var(--exp-dur,.8s) ease both;will-change:transform,opacity;}\n' +
'@keyframes hdrPopIn{from{opacity:.0;transform:scale(calc(1 - .06 * var(--exp-int,.5)))}to{opacity:1;transform:scale(1)}}\n' +
'@keyframes hdrPopOut{from{opacity:1;transform:scale(1)}to{opacity:.0;transform:scale(calc(1 - .06 * var(--exp-int,.5)))}}\n' +
'.region-expand-underline{animation:hdrUnderlineIn var(--exp-dur,.8s) ease both;position:relative;}\n' +
'.region-collapse-underline{animation:hdrUnderlineOut var(--exp-dur,.8s) ease both;position:relative;}\n' +
'@keyframes hdrUnderlineIn{from{opacity:.0}to{opacity:1}}\n' +
'@keyframes hdrUnderlineOut{from{opacity:1}to{opacity:.0}}\n' +
'.region-expand-underline::after,.region-collapse-underline::after{content:"";position:absolute;left:0;right:0;bottom:-4px;height:2px;background:linear-gradient(90deg, rgba(255,255,255,.0), rgba(255,255,255,.35), rgba(255,255,255,.0));transform-origin:left center;}\n' +
'.region-expand-underline::after{animation:hdrULDraw var(--exp-dur,.8s) ease both;}\n' +
'.region-collapse-underline::after{animation:hdrULErase var(--exp-dur,.8s) ease both;}\n' +
'@keyframes hdrULDraw{from{transform:scaleX(.2);opacity:.4}to{transform:scaleX(1);opacity:.9}}\n' +
'@keyframes hdrULErase{from{transform:scaleX(1);opacity:.9}to{transform:scaleX(.2);opacity:.4}}\n' +
'.region-expand-ripple{animation:hdrRippleIn var(--exp-dur,.8s) ease both;}\n' +
'.region-collapse-ripple{animation:hdrRippleOut var(--exp-dur,.8s) ease both;}\n' +
'@keyframes hdrRippleIn{0%{box-shadow:0 0 0 0 rgba(255,255,255,.0)}50%{box-shadow:0 0 calc(6px + 6px * var(--exp-int,.6)) rgba(255,255,255,.25)}100%{box-shadow:0 0 0 0 rgba(255,255,255,.0)}}\n' +
'@keyframes hdrRippleOut{0%{box-shadow:0 0 calc(6px + 6px * var(--exp-int,.6)) rgba(255,255,255,.25)}100%{box-shadow:0 0 0 0 rgba(255,255,255,.0)}}\n' +
'.region-expand-glitch{animation:hdrGlitchIn var(--exp-dur,.8s) steps(6,end) both;}\n' +
'.region-collapse-glitch{animation:hdrGlitchOut var(--exp-dur,.8s) steps(6,end) both;}\n' +
'@keyframes hdrGlitchIn{0%{transform:translate(0,0);opacity:0}30%{transform:translate(-1px,1px);opacity:.6}60%{transform:translate(1px,-1px);opacity:.85}100%{transform:translate(0,0);opacity:1}}\n' +
'@keyframes hdrGlitchOut{0%{transform:translate(0,0);opacity:1}30%{transform:translate(1px,-1px);opacity:.85}60%{transform:translate(-1px,1px);opacity:.6}100%{transform:translate(0,0);opacity:0}}\n' +
'@keyframes rbFadeIn{from{opacity:0}to{opacity:1}}\n' +
'@keyframes rbFadeOut{from{opacity:1}to{opacity:0}}\n' +
'@keyframes rbSlideDownIn{from{opacity:.0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}\n' +
'@keyframes rbSlideDownOut{from{opacity:1;transform:translateY(0)}to{opacity:.0;transform:translateY(-8px)}}\n' +
'@keyframes rbSlideUpIn{from{opacity:.0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}\n' +
'@keyframes rbSlideUpOut{from{opacity:1;transform:translateY(0)}to{opacity:.0;transform:translateY(8px)}}\n' +
'@keyframes rbZoomIn{from{opacity:.0;transform:scale(calc(1 - .06 * var(--rb-int,.5)))}to{opacity:1;transform:scale(1)}}\n' +
'@keyframes rbZoomOut{from{opacity:1;transform:scale(1)}to{opacity:.0;transform:scale(calc(1 - .06 * var(--rb-int,.5)))}}\n' +
'@keyframes rbZoomOutIn{from{opacity:.0;transform:scale(calc(1 + .06 * var(--rb-int,.5)))}to{opacity:1;transform:scale(1)}}\n' +
'@keyframes rbZoomInOut{from{opacity:1;transform:scale(1)}to{opacity:.0;transform:scale(calc(1 + .06 * var(--rb-int,.5)))}}';
          partsEx.push(__regionCssSubset);
          try { console.warn('[Ny.Export] injected region animation subset into export CSS'); } catch(_eWarn){}
        } else {
          try { console.log('[Ny.Export] region animation CSS present - no subset injection'); } catch(_eLog2){}
        }
      } catch(__regionEx) { try { console.warn('[Ny.Export] region CSS subset inject error', __regionEx); } catch(_e){} }

      // 移除冗余 essentials，改由“主题 + UI 子集 + 效果子集”提供所需样式，避免重复与未使用规则
      try { var __hdrCss = regionHeaderGlassCss(); if (__hdrCss && __hdrCss.replace(/\s+/g,'').length){ partsEx.push('/* ====== Export: region header glass subset ====== */\n' + __hdrCss); } } catch(__hdrEx){}
      var essentialsCss = "";
/* 汇总为最终注入样式（若使用点阵体与未能预抓取的 Google 字体，在样式顶部加入 @import） */
var __pre = '';
if (__zeoImport) __pre += __zeoImport + '\n';
try {
  if (__gfImports && __gfImports.length) {
    for (var __i=0; __i<__gfImports.length; __i++) {
      var __u = __gfImports[__i];
      if (__u && typeof __u === 'string') __pre += "@import url('" + __u + "');\n";
    }
  }
} catch(__eImp){}
/* 导出必需：section2-sizing 子集（含值框尺寸/偏移与长文左对齐），确保导出与预览一致 */
var __essentials = '/* essentials: section2-sizing subset */\n'
  + '.status-preview-wrapper .st-item{margin-left:calc(1% * var(--item-offset-pct, 0));margin-right:calc(1% * var(--item-offset-right-pct, 0));}\n'
  + '.status-preview-wrapper .st-item .st-value{--_vb-base-max:160px;width:clamp(120px,40vw,calc(var(--_vb-base-max) * var(--vb-width-pct, 100) / 100));transform:translateX(calc(1% * var(--vb-offset-pct, 0)));}\n'
  + '.status-preview-wrapper .st-item .st-value.st-text{--_vb-base-max:240px;max-width:clamp(120px,60vw,calc(var(--_vb-base-max) * var(--vb-width-pct, 100) / 100));text-align:right;}\n'
  + '.status-preview-wrapper .st-item .st-value.st-longtext{--_vb-base-max:240px;width:100%;max-width:100%;transform:none;text-align:left;direction:ltr;padding-left:0;padding-right:0;}\n'
  + '.status-preview-wrapper .st-item .st-value:not(.st-longtext){padding-right:1ch;}\n'
  + '/* essentials: page reset */\nhtml,body{margin:0;padding:0;}\n/* essentials: wrapper base */\n'  + '.status-preview-wrapper{position:relative;box-sizing:border-box;}\n'  + '/* essentials: background layers subset */\n'
  + '.status-preview-wrapper .bg-layers{position:absolute;inset:0;z-index:0;pointer-events:none;border-radius:inherit;overflow:hidden;}\n'
  + '.status-preview-wrapper .bg-layer{position:absolute;inset:0;background-position:center;background-size:cover;background-repeat:no-repeat;}\n'
  + '.status-preview-wrapper .bg-components-layer{position:absolute;inset:0;z-index:2;pointer-events:none;}\n'
  + '.status-preview-wrapper .bg-comp{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:auto;user-select:none;-webkit-user-drag:none;}';
var bundled = __pre + partsEx.join('\n\n') + '\n' + __essentials + '\n' + responsiveLayoutCss();
// Ensure collapsed region fold rules present to remove all placeholder space on collapse
bundled += "\n/* collapsed region fold rules */\n.st-region.collapsed > .st-region-body{display:none !important;margin:0 !important;padding:0 !important;}\n.st-region.collapsed{margin-bottom:0 !important;}\n.st-region.collapsed .st-region-header{margin-bottom:0 !important;}";
try { if (bundled.indexOf('.status-preview-wrapper .bg-layers') === -1) { bundled += '\n' + bgLayersSubsetCss(); } } catch(_eBgExt){}

      var bundledCheck = bundled.replace(/\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, '').trim();
      if (!/\S/.test(bundledCheck)) {
        throw new Error('CSS 内联结果为空');
      }

      // Remove ALL external CSS links and inject bundled CSS
      var withoutLinks = docStr
        .replace(/<link[^>]+href="ny-[^"]+\.css"[^>]*>\s*/g, '')
        .replace(/<link\b[^>]*data-ny-custom-font=["']true["'][^>]*>\s*/gi, '')
        .replace(/<style\s+id=["']ny-inline-style["'][^>]*>\s*<\/style>\s*/i, '');
      // 在最终文档头部插入字体预连接与样式链接，保证字体在运行时可加载（即使不内联 .woff2）
      var __headLinks = '';
      try {
        __headLinks += '<link rel="preconnect" href="https://fonts.googleapis.com">\n';
        __headLinks += '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n';
        if (__needBoutiqueImport) {
          __headLinks += '<link rel="stylesheet" href="https://fontsapi.zeoseven.com/65/main/result.css">\n';
        }
        if (__gfLinks && __gfLinks.length) {
          for (var __li = 0; __li < __gfLinks.length; __li++) {
            var __lu = __gfLinks[__li];
            if (__lu && typeof __lu === 'string') {
              __headLinks += '<link rel="stylesheet" href="' + __lu + '">\n';
            }
          }
        }
      } catch(__eHead){}
      var injected = withoutLinks.replace(
        '</head>',
        __headLinks + '<style data-ny-css-inlined="true">' + bundled.replace(/<\/style>/gi, '</s' + 'tyle>') + '</style></head>'
      );
      return injected;
    }

    // Inline external non-CSS assets strictly: any embedding failure throws, no回退
    async function inlineExternalAssets(doc) {
      var html = String(doc);

      function toAbsUrl(ref, base) {
        return new URL(ref, base || window.location.href).href;
      }
      async function fetchArrayBufferStrict(url) {
        var res = await fetch(url);
        if (!res.ok) throw new Error('资源获取失败: ' + url + ' HTTP ' + res.status);
        return await res.arrayBuffer();
      }
      function ab2b64(buf) {
        var bin = '';
        var bytes = new Uint8Array(buf);
        for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        return btoa(bin);
      }
      function guessMimeByExt(u) {
        var lc = (u || '').toLowerCase();
        if (lc.endsWith('.woff2')) return 'font/woff2';
        if (lc.endsWith('.woff')) return 'font/woff';
        if (lc.endsWith('.ttf')) return 'font/ttf';
        if (lc.endsWith('.otf')) return 'font/otf';
        if (lc.endsWith('.svg')) return 'image/svg+xml';
        if (lc.endsWith('.png')) return 'image/png';
        if (lc.endsWith('.jpg') || lc.endsWith('.jpeg')) return 'image/jpeg';
        if (lc.endsWith('.gif')) return 'image/gif';
        if (lc.endsWith('.webp')) return 'image/webp';
        return 'application/octet-stream';
      }
      async function toDataUrlStrict(absUrl) {
        var buf = await fetchArrayBufferStrict(absUrl);
        var mime = guessMimeByExt(absUrl);
        return 'data:' + mime + ';base64,' + ab2b64(buf);
      }

      async function replaceAsync(re, input, onMatch) {
        var out = '';
        var last = 0; var m;
        while ((m = re.exec(input)) !== null) {
          out += input.slice(last, m.index) + await onMatch(m);
          last = re.lastIndex;
        }
        out += input.slice(last);
        return out;
      }

      // 1) Prefer absolute URL for <img src="..."> to avoid huge base64 payloads
      var reImg = /<img\b[^>]*\bsrc=(["'])([^"']+)\1/gi;
      html = await replaceAsync(reImg, html, async function (m) {
        var src = m[2];
        if (/^(data:|about:|chrome:|edge:)/i.test(src)) return m[0];
        var abs = toAbsUrl(src);
        // Keep as absolute URL (no base64 inlining)
        return m[0].replace(src, abs);
      });

      // 2) Inline inline-style/background url(...) —— 跳过 <script> 块，避免破坏 JS 字符串
      var reUrl = /url\(([^)]+)\)/gi;
      try {
        var reScript = /<script\b[\s\S]*?<\/script>/gi;
        var __scripts = [];
        var __placeholder = function(i){ return '___NY_SCRIPT_BLOCK_' + i + '___'; };
        var __withoutScripts = html.replace(reScript, function(m){ __scripts.push(m); return __placeholder(__scripts.length - 1); });
        var __processed = await replaceAsync(reUrl, __withoutScripts, async function (m) {
          var raw = m[1].trim().replace(/^['"]|['"]$/g, '');
          if (/^(data:|about:|chrome:|edge:)/i.test(raw)) return m[0];
          var abs = toAbsUrl(raw);
          // Always prefer absolute URL (no base64 inlining), including .bg-layer background-image
          return 'url(\'' + abs + '\')';
        });
        html = __processed.replace(/___NY_SCRIPT_BLOCK_(\d+)___/g, function(_, idx){
          var i = parseInt(idx,10);
          return (__scripts[i] != null ? __scripts[i] : '');
        });
      } catch(__reUrlErr) {
        // Fallback: still prefer absolute URL over base64 even if scripts are not temporarily stripped
        html = await replaceAsync(reUrl, html, async function (m) {
          var raw = m[1].trim().replace(/^['"]|['"]$/g, '');
          if (/^(data:|about:|chrome:|edge:)/i.test(raw)) return m[0];
          var abs = toAbsUrl(raw);
          return 'url(\'' + abs + '\')';
        });
      }

      // 3) Inline FX config petalIconUrl
      var rePetal = /("petalIconUrl"\s*:\s*")([^"]+)(")/gi;
      html = await replaceAsync(rePetal, html, async function (m) {
        var url = m[2];
        if (!url || /^(data:|about:|chrome:|edge:)/i.test(url)) return m[0];
        var abs = toAbsUrl(url);
        if (!/\.(png|jpe?g|gif|webp|svg)(\?|#|$)/i.test(abs)) return m[0].replace(url, abs);
        var dataUrl = await toDataUrlStrict(abs);
        return m[1] + dataUrl + m[3];
      });

      return html;
    }

    // UI bindings (no-op placeholders)
    function attachGenerateButton(btn) {
      ensure();
      var el = btn || (document && document.getElementById('generate-btn'));
      if (!el) return;
      if (el.__nyBound) return;
      el.__nyBound = true;
    
      function setValue(id, val) { try { var ta = document.getElementById(id); if (ta) ta.value = String(val == null ? '' : val); } catch (_e) {} }
      function setClip(id, clip) { try { var b = document.getElementById(id); if (b) b.dataset.clip = String(clip == null ? '' : clip); } catch (_e) {} }
      function toJson(s) { return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n').replace(/\//g, '\\/'); }
    
    
      el.addEventListener('click', async function () {
        try {
          var modal = document.getElementById('code-modal');
          // 若已打开则关闭并还原标题
          if (modal && modal.style.display === 'flex') {
            closeCodeModal();
            el.textContent = '✨ 生成代码';
            return;
          }
          // 未找到弹窗也允许继续：由 openCodeModal 动态创建一个最小可用弹窗
          el.textContent = '关闭';
          openCodeModal();
          try { modal = document.getElementById('code-modal'); } catch(_re){}
          await refreshOutputs(true, { inlineGroup: true });
        } catch (e) {
          try { showErrorModal('打开生成弹窗失败', e); } catch (_e2) {}
          try { console.warn('[Ny.Export] generate click error', e); } catch (_e3) {}
        }
      });
    }
    function attachCopyHandlers(root) {
      ensure();
      var scope = root || document;
      try {
        var buttons = scope.querySelectorAll('.btn-copy');
        buttons.forEach(function (btn) {
          if (btn.__nyBound) return;
          btn.__nyBound = true;
          btn.addEventListener('click', function () {
            try {
              var originalText = btn.textContent;
              var clip = btn.dataset.clip;
              if (clip != null && clip !== '') {
                var taTmp = document.createElement('textarea');
                taTmp.style.position = 'fixed';
                taTmp.style.opacity = '0';
                taTmp.value = clip;
                document.body.appendChild(taTmp);
                taTmp.select();
                document.execCommand('copy');
                document.body.removeChild(taTmp);
              } else {
                var targetId = btn.dataset.target;
                var ta = targetId ? document.getElementById(targetId) : null;
                if (!ta) return;
                ta.select();
                document.execCommand('copy');
              }
              btn.textContent = '已复制';
              setTimeout(function () { btn.textContent = originalText || '复制'; }, 1200);
            } catch (e) {
              try { console.warn('[Ny.Export] copy error', e); } catch (_e) {}
            }
          });
        });
      } catch (e) { try { console.warn('[Ny.Export] attachCopyHandlers error', e); } catch (_e) {} }
    }
    function openCodeModal(id) {
      ensure();
      try {
        var modal = document.getElementById('code-modal');
        // 若不存在则动态创建一个最小可用的弹窗，包含必要的输出文本域
        if (!modal) {
          modal = document.createElement('div');
          modal.id = 'code-modal';
          modal.style.position = 'fixed';
          modal.style.inset = '0';
          modal.style.zIndex = '99998';
          modal.style.display = 'none';
          modal.innerHTML =
            '<div class="modal-backdrop" style="position:absolute;inset:0;background:rgba(0,0,0,.45)"></div>' +
            '<div class="modal-dialog" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(96vw,1000px);max-height:80vh;background:#1b1c20;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.45);overflow:auto;padding:12px 12px 16px;">' +
              '<div class="modal-header" style="display:flex;justify-content:space-between;align-items:center;padding:6px 4px 10px 4px;border-bottom:1px solid rgba(255,255,255,.08);">' +
                '<span>输出代码</span>' +
                '<button id="code-modal-close" class="btn" style="padding:6px 10px;border-radius:8px;background:#2a2d34;color:#fff;border:1px solid rgba(255,255,255,.15);cursor:pointer">关闭</button>' +
              '</div>' +
              '<div class="modal-body" style="display:grid;gap:10px;padding-top:10px">' +
                '<label style="font-weight:600;">HTML</label><textarea id="statusbar-code" style="width:100%;height:220px;"></textarea>' +
                '<label style="font-weight:600;">实时HTML</label><textarea id="statusbar-code-live" style="width:100%;height:120px;"></textarea>' +
                '<label style="font-weight:600;">分组片段</label><textarea id="replace-string" style="width:100%;height:180px;"></textarea>' +
                '<label style="font-weight:600;">原始代码</label><textarea id="original-code" style="width:100%;height:120px;"></textarea>' +
                '<label style="font-weight:600;">AI 模板</label><textarea id="ai-template" style="width:100%;height:120px;"></textarea>' +
                '<label style="font-weight:600;">AI 模板（内联）</label><textarea id="ai-template-inline" style="width:100%;height:120px;"></textarea>' +
                '<label style="font-weight:600;">查找正则</label><textarea id="find-regex" style="width:100%;height:80px;"></textarea>' +
                '<label style="font-weight:600;">正则说明</label><textarea id="regex-recipe" style="width:100%;height:140px;"></textarea>' +
              '</div>' +
            '</div>';
          document.body.appendChild(modal);
        }
        // 如有原 UI 的“第3区块”，则迁移到弹窗容器（若存在）
        var sec3Body = document.querySelector('#section-3 .section-body');
        var container = document.getElementById('moved-section3-modal');
        if (sec3Body && container && !modal.__nyMoved) {
          var placeholder = document.createElement('div');
          placeholder.id = 'section3-placeholder';
          placeholder.style.display = 'none';
          sec3Body.parentNode.insertBefore(placeholder, sec3Body);
          container.innerHTML = '';
          container.appendChild(sec3Body);
          container.style.display = 'block';
          modal.__nyMoved = true;
          modal.__nyPlaceholder = placeholder;
          modal.__nyMovedBody = sec3Body;
        }
        modal.style.display = 'flex';
        var closeBtn = document.getElementById('code-modal-close');
        var backdrop = modal.querySelector('.modal-backdrop');
        if (closeBtn && !closeBtn.__nyBound) { closeBtn.__nyBound = true; closeBtn.addEventListener('click', closeCodeModal); }
        if (backdrop && !backdrop.__nyBound) { backdrop.__nyBound = true; backdrop.addEventListener('click', closeCodeModal); }
      } catch (e) { try { console.warn('[Ny.Export] openCodeModal error', e); } catch (_e) {} }
    }
    function closeCodeModal() {
      ensure();
      try {
        var modal = document.getElementById('code-modal');
        if (!modal) return;
        modal.style.display = 'none';
        var genBtn = document.getElementById('generate-btn');
        if (genBtn) genBtn.textContent = '✨ 生成代码';
    
        if (modal.__nyMoved && modal.__nyPlaceholder && modal.__nyMovedBody) {
          var ph = modal.__nyPlaceholder;
          var body = modal.__nyMovedBody;
          if (ph.parentNode) {
            ph.parentNode.insertBefore(body, ph);
            ph.parentNode.removeChild(ph);
          }
          var container = document.getElementById('moved-section3-modal');
          if (container) { container.style.display = 'none'; container.innerHTML = ''; }
          modal.__nyMoved = false;
          modal.__nyPlaceholder = null;
          modal.__nyMovedBody = null;
        }
      } catch (e) { try { console.warn('[Ny.Export] closeCodeModal error', e); } catch (_e) {} }
    }
    // 全局静态化（移除脚本/事件处理器/js:协议），用于"实时 HTML（静态化）"与 replaceString 构造
    function __toStaticHtmlLike(s) {
      try {
        var out = String(s || '');
        out = out.replace(/<%[\s\S]*?%>/g, '');
        out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
        // 保留进度条的 onclick 事件，移除其他内联事件
        out = out.replace(/\son(?!click\s*=\s*"\(function\(bar\))[a-z]+\s*=\s*"[^"]*"/gi, '');
        out = out.replace(/\son(?!click\s*=\s*'\(function\(bar\))[a-z]+\s*=\s*'[^']*'/gi, '');
        out = out.replace(/\shref\s*=\s*"javascript:[^"]*"/gi, ' href="#"');
        out = out.replace(/\shref\s*=\s*'javascript:[^']*'/gi, ' href="#"');
        return out;
      } catch (_e) { return String(s || ''); }
    }
    // 基于"状态栏 HTML（实时生成→静态化）"构造 replaceString：仅替换"值"为 $n 占位，其他完全一致
    function __buildReplaceFromLiveHtml(htmlStr) {
      try {
        var doc = document.implementation.createHTMLDocument('ny-replace');
        doc.documentElement.innerHTML = String(htmlStr || '');
        var wrap = doc.getElementById('ny-status') || doc.querySelector('.status-preview-wrapper');
        var list = wrap ? wrap.querySelectorAll('.st-body .st-item') : [];
        var idx = 1;
        for (var i = 0; i < list.length; i++) {
          var el = list[i];
          if (!el) continue;
          var t = (el.getAttribute('data-type') || '').toLowerCase();
          if (t === 'divider') continue;
          var hasBar = !!el.querySelector('.st-progress-bar');
          var ph = '$' + (idx++);
          if (hasBar) {
            // 🔧 FIX: 进度条宽度替换 - 确保使用占位符而不是固定数值
            var fill = el.querySelector('.st-progress-bar .st-progress-bar-fill');
            if (fill) {
              var st = String(fill.getAttribute('style') || '');
              // 🔧 CRITICAL FIX: 先清理掉所有内联的像素宽度值，避免覆盖占位符
              st = st.replace(/width\s*:\s*[\d.]+px\s*;?/gi, '');
              // 处理动画模式：替换 --target 变量中的数值为占位符
              if (/\b--target\s*:\s*[-\d.]+%/i.test(st)) {
                st = st.replace(/(--target\s*:\s*)(-?\d+(?:\.\d+)?)%/i, '$1' + ph + '%');
              } else {
                // 如果没有--target变量，直接替换width中的数值为占位符
                st = st.replace(/(width\s*:\s*)(?:[-\d.]+%|[\d.]+px)/gi, '$1' + ph + '%');
              }
              // 确保style属性中包含width占位符
              if (!/width\s*:\s*\$\d+%/i.test(st)) {
                st = (st.trim().replace(/;?\s*$/, '') + '; width: ' + ph + '%').trim();
              }
              fill.setAttribute('style', st);
            }
            // 替换百分比显示文本为占位符
            var pct = el.querySelector('.st-progress-percent');
            if (pct) {
              pct.textContent = ph + '%';
              var pst = String(pct.getAttribute('style') || '');
              // 替换 --pct 变量中的数值为占位符
              pst = pst.replace(/(--pct\s*:\s*)(-?\d+(?:\.\d+)?)%/i, '$1' + ph + '%');
              pct.setAttribute('style', pst);
            }
          } else {
            // 文本/长文本：替换值节点文本为 $n
            var val = el.querySelector('.st-value');
            if (val) {
              while (val.firstChild) val.removeChild(val.firstChild);
              val.appendChild(doc.createTextNode(ph));
            }
          }
        }
        // 输出完整文档并再做一次静态化，确保无脚本/事件
        var out = doc.documentElement.outerHTML;
        return __toStaticHtmlLike(out);
      } catch (_e) { return String(htmlStr || ''); }
    }
    async function downloadJSON(filename, payload) {
      ensure();
      try {
        var cfg = State.customization || {};
        // 优先使用 modal 中“实时 HTML（静态化）”，保证结构与预览一致
        var liveTa = null, sourceHtml = '';
        try { liveTa = document.getElementById('statusbar-code-live'); } catch(_e0){}
        sourceHtml = liveTa && liveTa.value ? String(liveTa.value) : '';
        if (!/\S/.test(sourceHtml)) {
          // 回退：直接构建一次 ReplacementHTML 再静态化
          try { sourceHtml = __toStaticHtmlLike(Ny.Export.buildReplacementHTML(State, {})); } catch(_e1){ sourceHtml = ''; }
        }
        var replaceDoc = __buildReplaceFromLiveHtml(sourceHtml);
        var replaceFenced = '```\n' + replaceDoc + '\n```';
    
        var fr = Ny.Export.buildFindRegex(State, {});
        var findString = (typeof fr === 'string') ? fr : (fr && fr.pattern ? fr.pattern : '');
        var payloadObj = payload || {
          id: 'ny-' + Date.now(),
          scriptName: State.currentTitle || '状态',
          findRegex: findString,
          replaceString: replaceFenced,
          trimStrings: [],
          placement: [1, 2],
          disabled: false,
          markdownOnly: true,
          promptOnly: false,
          runOnEdit: true,
          substituteRegex: 1,
          minDepth: null,
          maxDepth: null
        };
        var blob = new Blob([JSON.stringify(payloadObj, null, 4)], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename || '酒馆正则文件.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); try { document.body.removeChild(a); } catch (_e) {} }, 100);
      } catch (e) { try { showErrorModal('下载正则文件失败', e); } catch (_e) {} }
    }

    // Auto-sync: lightweight refresh of generated outputs when preview/state changes
    var autoSyncMO = null;
    var autoSyncTimer = null;
    
    async function refreshOutputs(isHeavy, options) {
      ensure();
      try {
        function setValue(id, val) { try { var ta = document.getElementById(id); if (ta) ta.value = String(val == null ? '' : val); } catch (_e) {} }
        function setClip(id, clip) { try { var b = document.getElementById(id); if (b) b.dataset.clip = String(clip == null ? '' : clip); } catch (_e) {} }
        function toJson(s) { return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n').replace(/\//g, '\\/'); }
        function stripTemplateTags(s) { try { return String(s).replace(/<%[\s\S]*?%>/g, ''); } catch (_e) { return String(s || ''); } }
        function toStaticHtml(s) {
          try {
            var out = String(s || '');
            // 移除 EJS/JSP 等模板标记
            out = out.replace(/<%[\s\S]*?%>/g, '');
            // 移除所有内联脚本块
            out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
            // 保留进度条的 onclick 事件，移除其他内联事件处理器
            out = out.replace(/\son(?!click\s*=\s*"\(function\(bar\))[a-z]+\s*=\s*"[^"]*"/gi, '');
            out = out.replace(/\son(?!click\s*=\s*'\(function\(bar\))[a-z]+\s*=\s*'[^']*'/gi, '');
            // 将 javascript: 协议替换为 #
            out = out.replace(/\shref\s*=\s*"javascript:[^"]*"/gi, ' href="#"');
            out = out.replace(/\shref\s*=\s*'javascript:[^']*'/gi, ' href="#"');
            return out;
          } catch (_e) { return String(s || ''); }
        }
    
        var cfg = State.customization || {};
        var outs = generateAll(State, {});
        var usingFx = !!(cfg.starEnabled || cfg.sparkleEnabled || cfg.petalEnabled);
    
        var htmlDoc = outs.html;
        var groupDoc = outs.snippet;
        // Sanitize invalid CSS variable values for export: prevent "--bar-color: undefined/null/empty;" leaking into final HTML
        var safeBar = (cfg.section2BarColor && cfg.section2BarColor.trim())
          ? cfg.section2BarColor.trim()
          : ((cfg.primaryColor && String(cfg.primaryColor).trim()) ? String(cfg.primaryColor).trim() : '#6a717c');
        function __sanitizeBar(doc){
          try {
            var s = String(doc || '');
            s = s.replace(/(--bar-color\\s*:\\s*)(undefined|null)(\\s*;)/gi, '$1' + safeBar + '$3');
            s = s.replace(/(--bar-color\\s*:\\s*)(\\s*)(;)/gi, '$1' + safeBar + '$3');
            return s;
          } catch(_e){ return doc; }
        }
        htmlDoc = __sanitizeBar(htmlDoc);
        groupDoc = __sanitizeBar(groupDoc);
        try { console.debug('[Ny.Export] sanitize bar-color applied:', safeBar); } catch(_e){}

        // 优先使用右侧实时预览 DOM 快照，彻底消除与预览的结构/样式差异
        try {
          var __wrap = document.querySelector('#live-preview-container .status-preview-wrapper');
          if (__wrap) {
            var __escAttr = function(v){ var s = String(v == null ? '' : v); return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
            var __cls = __wrap.getAttribute('class') || '';
            var __st = __wrap.getAttribute('style') || '';
            // 深拷贝节点，保留预览时注入的 FX 层以保持导出结构一致
            var __clone = __wrap.cloneNode(true);
            
            // 🔧 FIX: 清理进度条的内联宽度样式，避免覆盖占位符
            try {
              var __fills = __clone.querySelectorAll('.st-progress-bar-fill');
              for (var __fi = 0; __fi < __fills.length; __fi++) {
                var __fill = __fills[__fi];
                if (!__fill) continue;
                var __fStyle = __fill.getAttribute('style') || '';
                // 移除内联的具体宽度值（px单位），保留百分比占位符
                __fStyle = __fStyle.replace(/width\s*:\s*[\d.]+px\s*;?/gi, '');
                __fill.setAttribute('style', __fStyle);
              }
              // 同时清理进度条容器和值容器的内联宽度
              var __bars = __clone.querySelectorAll('.st-progress-bar');
              for (var __bi = 0; __bi < __bars.length; __bi++) {
                var __bar = __bars[__bi];
                if (!__bar) continue;
                var __bStyle = __bar.getAttribute('style') || '';
                __bStyle = __bStyle.replace(/width\s*:\s*[\d.]+px\s*;?/gi, '');
                __bar.setAttribute('style', __bStyle);
              }
              var __vals = __clone.querySelectorAll('.st-item .st-value');
              for (var __vi = 0; __vi < __vals.length; __vi++) {
                var __val = __vals[__vi];
                if (!__val) continue;
                var __vStyle = __val.getAttribute('style') || '';
                // 移除具体像素宽度，保留CSS变量和百分比
                __vStyle = __vStyle.replace(/width\s*:\s*[\d.]+px\s*;?/gi, '');
                __vStyle = __vStyle.replace(/min-width\s*:\s*[\d.]+px\s*;?/gi, '');
                __vStyle = __vStyle.replace(/max-width\s*:\s*[\d.]+%\s*;?/gi, '');
                __val.setAttribute('style', __vStyle);
              }
            } catch(__cleanErr) {
              try { console.warn('[Ny.Export] clean inline width error', __cleanErr); } catch(_e){}
            }
            
            // 🔧 FIX: 移除 ny-live-overrides 样式块，避免覆盖占位符
            try {
              var __liveOverrides = __clone.querySelector('style#ny-live-overrides');
              if (__liveOverrides && __liveOverrides.parentNode) {
                __liveOverrides.parentNode.removeChild(__liveOverrides);
              }
            } catch(__overrideErr) {
              try { console.warn('[Ny.Export] remove live overrides error', __overrideErr); } catch(_e){}
            }
            
            // 运行时脚本会在页面载入时清理并重建 FX 层，从而避免重复。
            // 追加：将预览中的"实际字体/行高/字距"合并进外层 style，确保无外链时也能生效
            try {
              var __csw = getComputedStyle(__wrap);
              var __wff = (__csw.getPropertyValue('font-family') || '').trim();
              var __wlh = (__csw.getPropertyValue('line-height') || '').trim();
              var __wls = (__csw.getPropertyValue('letter-spacing') || '').trim();
              var __append = [];
              if (__wff) __append.push('font-family:' + __wff);
              if (__wlh) __append.push('line-height:' + __wlh);
              if (__wls) __append.push('letter-spacing:' + __wls);
              if (__append.length) {
                __st = (__st ? (__st.replace(/\s*;?\s*$/,'') + '; ') : '') + __append.join('; ') + ';';
              }
            } catch(__e_wcs){}
            // 追加：为关键文本节点内联写入“计算后的字体样式”，避免主题/外链缺失导致退化
            try {
              var __applyInline = function(nodes, props){
                try {
                  (nodes ? Array.prototype.slice.call(nodes) : []).forEach(function(el){
                    try {
                      var cs = getComputedStyle(el), buf = [];
                      props.forEach(function(p){
                        var v = cs.getPropertyValue(p);
                        if (v && String(v).trim()) buf.push(p + ':' + String(v).trim());
                      });
                      if (buf.length){
                        var prev = el.getAttribute('style') || '';
                        el.setAttribute('style', (prev ? (prev.replace(/\s*;?\s*$/,'') + '; ') : '') + buf.join('; ') + ';');
                      }
                    } catch(_e){}
                  });
                } catch(_ee){}
              };
              var __textProps = ['font-family','font-weight','font-style','text-transform','font-size','letter-spacing','text-shadow','color'];
              var __titleNode = __clone.querySelector('.st-title');
              if (__titleNode) __applyInline([__titleNode], __textProps);
              __applyInline(__clone.querySelectorAll('.st-label'), __textProps);
              __applyInline(__clone.querySelectorAll('.st-value'), __textProps);
            } catch(__e_inline){}
            try {
              // 仅对包含进度条的项，内联写入“值容器/条/填充”的计算样式，确保导出与预览长度/款式完全一致（不影响其他内容）
              var _liveBars = __wrap.querySelectorAll('.st-item .st-progress-bar');
              var _cloneBars = __clone.querySelectorAll('.st-item .st-progress-bar');
              var _n = Math.min(_liveBars.length, _cloneBars.length);
              function __copyProps(srcEl, dstEl, props){
                try{
                  if (!srcEl || !dstEl) return;
                  var cs = getComputedStyle(srcEl);
                  var prev = dstEl.getAttribute('style') || '';
                  var buf = [];
                  (props||[]).forEach(function(p){
                    try{
                      var v = cs.getPropertyValue(p);
                      if (v && String(v).trim()) buf.push(p + ':' + String(v).trim());
                    }catch(_ep){}
                  });
                  if (buf.length){
                    dstEl.setAttribute('style', (prev ? (prev.replace(/\s*;?\s*$/,'') + '; ') : '') + buf.join('; ') + ';');
                  }
                }catch(_e){}
              }
              for (var i=0; i<_n; i++){
                var lBar = _liveBars[i], cBar = _cloneBars[i];
                if (!lBar || !cBar) continue;
                var lItem = lBar.closest('.st-item'), cItem = cBar.closest('.st-item');
                var lVal = lItem ? lItem.querySelector('.st-value') : null;
                var cVal = cItem ? cItem.querySelector('.st-value') : null;
                var lFill = lBar.querySelector('.st-progress-bar-fill');
                var cFill = cBar.querySelector('.st-progress-bar-fill');
                // 1) 值容器：宽度与偏移（左右排列差异的关键）
                __copyProps(lVal, cVal, ['width','transform','min-width','max-width']);
                // 2) 进度条容器：尺寸与外观（边框/内边距/背景/阴影/宽度）
                __copyProps(lBar, cBar, ['height','border','border-radius','background','box-shadow','padding','margin','width']);
                // 3) 填充条：像素级宽度与外观（背景/滤镜/圆角/阴影/高度/宽度）
                __copyProps(lFill, cFill, ['height','border','border-radius','background','box-shadow','filter','width']);
              }
            } catch(__inlineBarErr){}
            /* 导出时默认折叠：在快照路径上也强制应用 rtExportCollapsed 初始状态（独立于预览当前状态） */
            try {
              var __regionsSnap = __clone.querySelectorAll('.st-region');
              var __itemsArr = Array.isArray(State.items) ? State.items.slice() : [];
              var __regionItems = __itemsArr.filter(function(x){ return x && x.type === 'region' && !x.parentRegionId; });
              var __count = Math.min(__regionsSnap.length, __regionItems.length);
              for (var __ri = 0; __ri < __count; __ri++) {
                var __rEl = __regionsSnap[__ri];
                var __rData = __regionItems[__ri] || {};
                var __shouldCollapse = !!(__rData.rtExportCollapsed ? true : __rData.collapsed);
                var __hdr = __rEl.querySelector('.st-region-header');
                var __body = __rEl.querySelector('.st-region-body');
                // 初始折叠类与内容显隐
                try { __rEl.classList.toggle('collapsed', __shouldCollapse); } catch(_eC){}
                if (__body) { __body.style.display = __shouldCollapse ? 'none' : ''; }
                // 初始折叠图标
                try {
                  var __icon = __hdr ? __hdr.querySelector('.st-region-toggle') : null;
                  var __style = String(__rData.rtToggleIconStyle || 'triangle');
                  var __exp = '▾', __col = '▶';
                  if (__style === 'plusminus') { __exp = '−'; __col = '+'; }
                  else if (__style === 'arrow') { __exp = '↓'; __col = '→'; }
                  else if (__style === 'custom') {
                    __exp = (__rData.rtToggleIconExp && String(__rData.rtToggleIconExp).trim()) ? String(__rData.rtToggleIconExp).trim() : '▾';
                    __col = (__rData.rtToggleIconCol && String(__rData.rtToggleIconCol).trim()) ? String(__rData.rtToggleIconCol).trim() : '▶';
                  }
                  if (__icon) __icon.textContent = __shouldCollapse ? __col : __exp;
                } catch(_eI){}
                // 折叠头部背景
                try {
                  if (__hdr) {
                    var __bgMode = String(__rData.rtCollapsedBgMode || 'none');
                    if (__shouldCollapse) {
                      if (__hdr.classList) __hdr.classList.remove('hdr-mode-glass');
                      if (__bgMode === 'solid') {
                        var __colr = (__rData.rtCollapsedBgColor && String(__rData.rtCollapsedBgColor).trim()) ? String(__rData.rtCollapsedBgColor).trim() : '';
                        __hdr.style.background = __colr || '';
                      } else if (__bgMode === 'gradient') {
                        var __a = (__rData.rtCollapsedGradStart && String(__rData.rtCollapsedGradStart).trim()) ? String(__rData.rtCollapsedGradStart).trim() : '';
                        var __b = (__rData.rtCollapsedGradEnd && String(__rData.rtCollapsedGradEnd).trim()) ? String(__rData.rtCollapsedGradEnd).trim() : '';
                        var __ang = (isFinite(__rData.rtCollapsedGradAngle) ? Number(__rData.rtCollapsedGradAngle) : 0);
                        __hdr.style.background = (__a && __b) ? ('linear-gradient(' + __ang + 'deg, ' + __a + ' , ' + __b + ' )') : '';
                      } else if (__bgMode === 'glass') {
                        __hdr.style.background = '';
                        if (__hdr.classList) __hdr.classList.add('hdr-mode-glass');
                      } else {
                        __hdr.style.background = '';
                      }
                    } else {
                      if (__hdr.classList) __hdr.classList.remove('hdr-mode-glass');
                      __hdr.style.background = '';
                    }
                    // 确保点击模式属性
                    try {
                      __hdr.setAttribute('data-toggle-mode', String(__rData.rtToggleMode || 'header'));
                    } catch(_eM){}
                    // 记录折叠头部背景模式以便兜底脚本读取
                    try { __hdr.setAttribute('data-cbg-mode', __bgMode); } catch(_eBgM){}
                  }
                } catch(_eBg){}
              }
            } catch(__applyColErr){}
            var __inner = __clone.innerHTML;
            var __titleText = (Ny && Ny.State && Ny.State.currentTitle) ? Ny.State.currentTitle : '角色状态';
            var __docFromSnap = [
              '<!DOCTYPE html>',
              '<html lang="zh-CN">',
              '<head>',
              '<meta charset="UTF-8">',
              '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
              '<title>' + esc(__titleText) + '</title>',
              '<style id="ny-inline-style"></style>',
              '</head>',
              '<body>',
              // 将预览外层 div 提升为 section 并补齐 id=ny-status，供后续 FX 注入与样式定位
              '<section id="ny-status" class="' + __escAttr(__cls) + '" style="' + __escAttr(__st) + '">',
              __inner,
              '</section>',
              '</body>',
              '</html>'
            ].join('\n');
            try {
  var __inlinedSnapHtml = await inlineExternalCss(__docFromSnap);
  htmlDoc = __inlinedSnapHtml;
  // 注入运行时“区域折叠/展开”脚本（来源于 Ny.CodeGen.buildReplacementHTML 的 <script>）
  try {
    var __mRS = String(outs && outs.html || '').match(/<script>([\s\S]*?)<\/script>/i);
    var __rs = __mRS ? __mRS[1] : '';
    if (false && __rs && __rs.replace(/\s+/g,'').length && htmlDoc.indexOf('.st-region-header') !== -1) {
      // 无条件注入，确保交互可用
      htmlDoc = htmlDoc.replace('</body>', '<script>' + __rs.replace('</script>', '<' + '/script>') + '</script>\n</body>');
    }
  } catch(__injErr) {}
} catch(__snapInlineErr) {
  htmlDoc = __docFromSnap;
  // 兜底：在未进行 CSS 内联时，同样注入运行时“区域折叠/展开”脚本
  try {
    var __mRS2 = String(outs && outs.html || '').match(/<script>([\s\S]*?)<\/script>/i);
    var __rs2 = __mRS2 ? __mRS2[1] : '';
    if (false && __rs2 && __rs2.replace(/\s+/g,'').length && htmlDoc.indexOf('.st-region-header') !== -1) {
      // 无条件注入
      htmlDoc = htmlDoc.replace('</body>', '<script>' + __rs2.replace('</script>', '<' + '/script>') + '</script>\n</body>');
    }
  } catch(__injErr2) {}
}
// 保持 replaceString 基于“静态分组片段（$n 占位）”，不使用快照覆盖 groupDoc
// groupDoc 继续沿用 outs.snippet，以确保值为变量占位符，便于正则捕获替换
// 追加：在快照完成内联后，补回预览中已加载的自定义字体<link>（data-ny-custom-font="true"）
// 避免 fonts.googleapis.com 等跨域失败导致字体缺失
try {
  var __fontLinksHtmlSnap = '';
  (document.querySelectorAll('link[data-ny-custom-font="true"][rel="stylesheet"][href]') || []).forEach(function(l){
    try { __fontLinksHtmlSnap += l.outerHTML; } catch(_e){}
  });
  if (__fontLinksHtmlSnap && __fontLinksHtmlSnap.replace(/\s+/g,'')) {
    htmlDoc  = htmlDoc.replace('</head>', __fontLinksHtmlSnap + '</head>');
    groupDoc = groupDoc.replace('</head>', __fontLinksHtmlSnap + '</head>');
  }
} catch(__snapFontLinkErr) {}
            try {
              var __fontLinksHtml = '';
              (document.querySelectorAll('link[data-ny-custom-font="true"][rel="stylesheet"][href]') || []).forEach(function(l){
                try { __fontLinksHtml += l.outerHTML; } catch(_e){}
              });
              if (__fontLinksHtml && __fontLinksHtml.replace(/\s+/g,'')) {
                htmlDoc  = htmlDoc.replace('</head>', __fontLinksHtml + '</head>');
                groupDoc = groupDoc.replace('</head>', __fontLinksHtml + '</head>');
              }
            } catch(__linkErr) {}
            try {
              var __pick = function(el, props){
                try{
                  if (!el) return '';
                  var cs = getComputedStyle(el);
                  var out = [];
                  (props||[]).forEach(function(p){
                    var v = cs.getPropertyValue(p);
                    if (v && String(v).trim()) out.push(p + ':' + String(v).trim());
                  });
                  return out.join(';');
                }catch(_e){ return ''; }
              };
              // 读取右侧预览中"实时显示"的计算样式，并写入导出文档的覆盖层，确保字体与进度条样式一致
              var __labelEl = __wrap.querySelector('.st-label');
              var __valueEl = __wrap.querySelector('.st-value');
              var __titleEl = __wrap.querySelector('.st-title');
              var __barEl   = __wrap.querySelector('.st-progress-bar');
              var __fillEl  = __wrap.querySelector('.st-progress-bar .st-progress-bar-fill');
              var __pctEl   = __wrap.querySelector('.st-progress-percent');

              // 收集所有需要的 CSS 属性值
              var __wCss = __pick(__wrap,    ['font-family','line-height','letter-spacing']);
              var __tCss = __pick(__titleEl, ['font-family','font-weight','font-style','text-transform','font-size','letter-spacing','text-shadow','color']);
              var __lCss = __pick(__labelEl, ['font-family','font-weight','font-style','text-transform','font-size','letter-spacing','color','-webkit-box-reflect']);
              var __vCss = __pick(__valueEl, ['font-family','font-weight','font-style','text-transform','font-size','letter-spacing','color','-webkit-box-reflect']);
              var __bCss = __pick(__barEl,   ['height','border','border-radius','background','box-shadow','padding']);
              var __fCss = __pick(__fillEl,  ['height','border','border-radius','background','box-shadow','filter']);
              var __pCss = __pick(__pctEl,   ['font-weight','font-size','color','text-shadow','background','padding','border-radius']);

              // 优化策略：将所有 font-family 属性合并为一条带 !important 的规则，避免重复
              var __fontFamilyMap = {};
              function __extractFontFamily(cssStr) {
                var m = cssStr.match(/font-family:([^;]+)/);
                return m ? m[1].trim() : null;
              }
              function __removeFontFamily(cssStr) {
                return cssStr.replace(/font-family:[^;]+;?/g, '').replace(/;+/g, ';').replace(/^;|;$/g, '');
              }
              
              var __wFf = __extractFontFamily(__wCss);
              var __tFf = __extractFontFamily(__tCss);
              var __lFf = __extractFontFamily(__lCss);
              var __vFf = __extractFontFamily(__vCss);
              
              // 移除各个规则中的 font-family，稍后统一添加
              __wCss = __removeFontFamily(__wCss);
              __tCss = __removeFontFamily(__tCss);
              __lCss = __removeFontFamily(__lCss);
              __vCss = __removeFontFamily(__vCss);

              // 构建优化后的 CSS
              var __liveCss = '#ny-status:has(.bg-layers){border:0 !important; --st-glow: transparent !important; overflow:hidden !important;}' + '\n';
              var __fontFamilyRules = [];
              
              // 只有当有实际属性时才添加规则
              if (__wCss) __liveCss += '#ny-status{' + __wCss + '}\n';
              if (__tCss) __liveCss += '#ny-status .st-title{' + __tCss + '}\n';
              if (__lCss) __liveCss += '#ny-status .st-label{' + __lCss + '}\n';
              if (__vCss) __liveCss += '#ny-status .st-value{' + __vCss + '}\n';
              if (__bCss) __liveCss += '#ny-status .st-progress-bar{' + __bCss + '}\n';
              if (__fCss) __liveCss += '#ny-status .st-progress-bar .st-progress-bar-fill{' + __fCss + '}\n';
              if (__pCss) __liveCss += '#ny-status .st-progress-percent{' + __pCss + '}\n';
              
              // 合并所有使用相同 font-family 的选择器
              if (__wFf || __tFf || __lFf || __vFf) {
                var __selectors = [];
                if (__wFf) __selectors.push('#ny-status');
                if (__tFf && __tFf === __wFf) __selectors.push('#ny-status .st-title');
                else if (__tFf) __fontFamilyRules.push('#ny-status .st-title{font-family:' + __tFf + ' !important}');
                
                if (__lFf && __lFf === __wFf) __selectors.push('#ny-status .st-label');
                else if (__lFf) __fontFamilyRules.push('#ny-status .st-label{font-family:' + __lFf + ' !important}');
                
                if (__vFf && __vFf === __wFf) __selectors.push('#ny-status .st-value');
                else if (__vFf) __fontFamilyRules.push('#ny-status .st-value{font-family:' + __vFf + ' !important}');
                
                // 如果有共同的字体，合并选择器
                if (__selectors.length > 0 && __wFf) {
                  __liveCss += __selectors.join(',') + '{font-family:' + __wFf + ' !important}\n';
                }
                
                // 添加不同字体的规则
                if (__fontFamilyRules.length > 0) {
                  __liveCss += __fontFamilyRules.join('\n') + '\n';
                }
              }

              if (__liveCss && __liveCss.replace(/\s+/g,'').length){
                var __safeCss = __liveCss.replace(/<\/style>/gi, '</s' + 'tyle>');
                // 🔒 FIX: 检查是否已存在 ny-live-overrides,避免重复注入
                if (/<style\s+id=["']ny-live-overrides["']>/i.test(htmlDoc)) {
                  htmlDoc = htmlDoc.replace(/<style\s+id=["']ny-live-overrides["']>([\s\S]*?)<\/style>/i,
                    '<style id="ny-live-overrides">' + __safeCss + '</style>');
                } else {
                  htmlDoc = htmlDoc.replace('</head>', '<style id="ny-live-overrides">' + __safeCss + '</style></head>');
                }
                if (/<style\s+id=["']ny-live-overrides["']>/i.test(groupDoc)) {
                  groupDoc = groupDoc.replace(/<style\s+id=["']ny-live-overrides["']>([\s\S]*?)<\/style>/i,
                    '<style id="ny-live-overrides">' + __safeCss + '</style>');
                } else {
                  groupDoc = groupDoc.replace('</head>', '<style id="ny-live-overrides">' + __safeCss + '</style></head>');
                }

                // 补充：收集预览实际使用的字体家族对应的 @font-face 规则，内联到导出文档
                try {
                  var __famSet = new Set();
                  function __normFamList(s){
                    return String(s || '').split(',').map(function(x){ return x.trim().replace(/^['"]|['"]$/g,''); }).filter(Boolean);
                  }
                  // 从 wrapper / title / 第一条 label 与 value 读取计算后的 font-family
                  try {
                    var __cs_wrap = getComputedStyle(__wrap);
                    __normFamList(__cs_wrap.getPropertyValue('font-family')).forEach(function(f){ if(f) __famSet.add(f); });
                  } catch(_e_wf){}
                  try {
                    if (__titleEl) {
                      var __cs_title = getComputedStyle(__titleEl);
                      __normFamList(__cs_title.getPropertyValue('font-family')).forEach(function(f){ if(f) __famSet.add(f); });
                    }
                  } catch(_e_tf){}
                  try {
                    var __firstLabel = __wrap.querySelector('.st-label');
                    if (__firstLabel) {
                      var __cs_l = getComputedStyle(__firstLabel);
                      __normFamList(__cs_l.getPropertyValue('font-family')).forEach(function(f){ if(f) __famSet.add(f); });
                    }
                  } catch(_e_lf){}
                  try {
                    var __firstValue = __wrap.querySelector('.st-value');
                    if (__firstValue) {
                      var __cs_v = getComputedStyle(__firstValue);
                      __normFamList(__cs_v.getPropertyValue('font-family')).forEach(function(f){ if(f) __famSet.add(f); });
                    }
                  } catch(_e_vf){}

                  function __collectFontFaces(fams){
                    var out = [];
                    try {
                      var sheets = document.styleSheets || [];
                      for (var i=0; i<sheets.length; i++){
                        var ss = sheets[i];
                        try {
                          var rules = ss.cssRules || ss.rules;
                          for (var j=0; rules && j<rules.length; j++){
                            var r = rules[j];
                            if (!r || !r.cssText) continue;
                            if (/@font-face/i.test(r.cssText)) {
                              var mm = r.cssText.match(/font-family\s*:\s*(['"]?)([^;'"]+)\1\s*;/i);
                              var fam = mm && mm[2] ? mm[2].trim().replace(/^['"]|['"]$/g,'') : '';
                              if (fam && fams.has(fam)) out.push(r.cssText);
                            }
                          }
                        } catch(_eSheet){}
                      }
                    } catch(_eSheets){}
                    return out.join('\n');
                  }

                  if (typeof __inlineFF !== 'function') {
async function __inlineFF(css) {
  try {
    var re = /url\(([^)]+)\)/g, out = '', last = 0, m;
    while ((m = re.exec(css)) !== null) {
      out += css.slice(last, m.index);
      var raw = m[1].trim().replace(/^['"]|['"]$/g,'');
      if (/^(data:|about:)/i.test(raw)) { out += m[0]; last = re.lastIndex; continue; }
      var abs = new URL(raw, document.location.href).href;
      // 保留字体外链，避免大量 .woff2 下载导致卡顿
      out += 'url(\'' + abs + '\')';
      last = re.lastIndex;
    }
    out += css.slice(last);
    return out;
  } catch(_e){ return css || ''; }
}
}
var __ffCss = await __inlineFF(__collectFontFaces(__famSet));if (__ffCss && __ffCss.replace(/\s+/g,'').length){
                    var __safeFf = __ffCss.replace(/<\/style>/gi, '</s' + 'tyle>');
                    htmlDoc  = htmlDoc.replace('</head>',  '<style id="ny-live-fontfaces">' + __safeFf + '</style></head>');
                    groupDoc = groupDoc.replace('</head>', '<style id="ny-live-fontfaces">' + __safeFf + '</style></head>');
                  }
                } catch(__ffErr) {}
              }
            } catch(__liveCssErr) {}
          }
        } catch(__snapErr){}
    
        var opt = options || {};
        var inlineHtml = !!isHeavy;
        var inlineGroup = !!isHeavy && opt.inlineGroup !== false;

        if (inlineHtml) {
          try {
            var inlinedDoc = await inlineExternalCss(htmlDoc);
            if (usingFx) inlinedDoc = exportInjectFx(inlinedDoc, cfg, false);
            try {
              inlinedDoc = await inlineExternalAssets(inlinedDoc);
            } catch (_assetInlineErr) {
              try { console.warn('[Ny.Export] assets inline failed (html), continue without assets inlining', _assetInlineErr); } catch (_ee) {}
            }
            htmlDoc = inlinedDoc;
          } catch (_inlineErr) {
            try { console.warn('[Ny.Export] inline failed, try CSSOM bundle fallback', _inlineErr); } catch (_e) {}
            try {
              var cssomDoc = await inlineFromCssomBundle(htmlDoc);
              if (usingFx) cssomDoc = exportInjectFx(cssomDoc, cfg, false);
              try {
                cssomDoc = await inlineExternalAssets(cssomDoc);
              } catch (_assetErr) {
                try { console.warn('[Ny.Export] CSSOM assets inline failed, continue without assets inlining', _assetErr); } catch (_ee) {}
              }
              htmlDoc = cssomDoc;
            } catch (_cssomErr) {
              try { console.warn('[Ny.Export] CSSOM fallback failed, try embedded bundle, then minimal fallback', _cssomErr); } catch (_e2) {}
              try {
                var embDoc = inlineFromEmbeddedBundle(htmlDoc);
                if (usingFx) embDoc = exportInjectFx(embDoc, cfg, false);
                try { embDoc = await inlineExternalAssets(embDoc); } catch (_embAssetErr) { try { console.warn('[Ny.Export] embedded assets inline failed (html), continue', _embAssetErr); } catch (_eee) {} }
                htmlDoc = embDoc;
              } catch (_embErr) {
                htmlDoc = injectInlineStyle(htmlDoc, minimalOfflineCss());
                if (usingFx) htmlDoc = exportInjectFx(htmlDoc, cfg, false);
              }
            }
          }
        } else {
          if (usingFx) { htmlDoc = exportInjectFx(htmlDoc, cfg, false); }
        }
        // Ensure final HTML contains a non-empty <style> after inlining; empty placeholder is not acceptable
        try {
          var __m = String(htmlDoc).match(/<style\b[^>]*>([\s\S]*?)<\/style>/i);
          var __style = __m ? __m[1] : '';
          var __useful = (__style && __style.replace(/\/\*[\s\S]*?\*\//g,'').trim().length > 20);
          if (!__useful) {
            try {
              var __cssomDoc2 = await inlineFromCssomBundle(htmlDoc);
              if (usingFx) __cssomDoc2 = exportInjectFx(__cssomDoc2, cfg, false);
              htmlDoc = __cssomDoc2;
              var __m2 = String(htmlDoc).match(/<style\b[^>]*>([\s\S]*?)<\/style>/i);
              var __c2 = __m2 ? __m2[1] : '';
              var __ok2 = (__c2 && __c2.replace(/\/\*[\s\S]*?\*\//g,'').trim().length > 20);
              if (!__ok2) {
                try {
                  var __embDoc2 = inlineFromEmbeddedBundle(htmlDoc);
                  if (usingFx) __embDoc2 = exportInjectFx(__embDoc2, cfg, false);
                  htmlDoc = __embDoc2;
                } catch(__emb2) {
                  htmlDoc = injectInlineStyle(htmlDoc, minimalOfflineCss());
                  if (usingFx) htmlDoc = exportInjectFx(htmlDoc, cfg, false);
                }
              }
            } catch (__cssom2) {
              try {
                var __embDoc3 = inlineFromEmbeddedBundle(htmlDoc);
                if (usingFx) __embDoc3 = exportInjectFx(__embDoc3, cfg, false);
                htmlDoc = __embDoc3;
              } catch(__emb3) {
                htmlDoc = injectInlineStyle(htmlDoc, minimalOfflineCss());
                if (usingFx) htmlDoc = exportInjectFx(htmlDoc, cfg, false);
              }
            }
          }
        } catch (__ensureErr) {}
        // Ensure final HTML contains a <style> block; if missing, try CSSOM then minimal fallback
        try {
          if (!/<style[\s>]/i.test(String(htmlDoc))) {
            try {
              var __cssomDoc2 = await inlineFromCssomBundle(htmlDoc);
              if (usingFx) __cssomDoc2 = exportInjectFx(__cssomDoc2, cfg, false);
              htmlDoc = __cssomDoc2;
            } catch (__cssom2) {
              try {
                var __embDoc4 = inlineFromEmbeddedBundle(htmlDoc);
                if (usingFx) __embDoc4 = exportInjectFx(__embDoc4, cfg, false);
                htmlDoc = __embDoc4;
              } catch(__emb4) {
                htmlDoc = injectInlineStyle(htmlDoc, minimalOfflineCss());
                if (usingFx) htmlDoc = exportInjectFx(htmlDoc, cfg, false);
              }
            }
          }
        } catch (__ensureErr) {}

        if (inlineGroup) {
          try {
            var inlinedGroup = await inlineExternalCss(groupDoc);
            if (usingFx) inlinedGroup = exportInjectFx(inlinedGroup, cfg, true);
            try {
              inlinedGroup = await inlineExternalAssets(inlinedGroup);
            } catch (_gAssetInlineErr) {
              try { console.warn('[Ny.Export] assets inline failed (group), continue without assets inlining', _gAssetInlineErr); } catch (_ee2) {}
            }
            groupDoc = inlinedGroup;
          } catch (_inlineErr2) {
            try { console.warn('[Ny.Export] group inline failed, try CSSOM bundle fallback', _inlineErr2); } catch (_e) {}
            try {
              var cssomGroup = await inlineFromCssomBundle(groupDoc);
              if (usingFx) cssomGroup = exportInjectFx(cssomGroup, cfg, true);
              try {
                cssomGroup = await inlineExternalAssets(cssomGroup);
              } catch (_gAssetErr) {
                try { console.warn('[Ny.Export] CSSOM assets inline (group) failed, continue', _gAssetErr); } catch (_ee2) {}
              }
              groupDoc = cssomGroup;
            } catch (_cssomErr2) {
              try { console.warn('[Ny.Export] CSSOM fallback (group) failed, try embedded bundle, then minimal fallback', _cssomErr2); } catch (_e2) {}
              try {
                var embGroup = inlineFromEmbeddedBundle(groupDoc);
                if (usingFx) embGroup = exportInjectFx(embGroup, cfg, true);
                try { embGroup = await inlineExternalAssets(embGroup); } catch (_gEmbAssetErr) { try { console.warn('[Ny.Export] embedded assets inline failed (group), continue', _gEmbAssetErr); } catch (_eee2) {} }
                groupDoc = embGroup;
              } catch (_embGErr) {
                groupDoc = injectInlineStyle(groupDoc, minimalOfflineCss());
                if (usingFx) groupDoc = exportInjectFx(groupDoc, cfg, true);
              }
            }
          }
        } else {
          if (usingFx) { groupDoc = exportInjectFx(groupDoc, cfg, true); }
        }
        // Ensure final group snippet contains a non-empty <style>; empty placeholder is not acceptable
        try {
          var __gm = String(groupDoc).match(/<style\b[^>]*>([\s\S]*?)<\/style>/i);
          var __gstyle = __gm ? __gm[1] : '';
          var __guseful = (__gstyle && __gstyle.replace(/\/\*[\s\S]*?\*\//g,'').trim().length > 20);
          if (!__guseful) {
            try {
              var __cssomGroup2 = await inlineFromCssomBundle(groupDoc);
              if (usingFx) __cssomGroup2 = exportInjectFx(__cssomGroup2, cfg, true);
              groupDoc = __cssomGroup2;
              var __gm2 = String(groupDoc).match(/<style\b[^>]*>([\s\S]*?)<\/style>/i);
              var __gc2 = __gm2 ? __gm2[1] : '';
              var __gok2 = (__gc2 && __gc2.replace(/\/\*[\s\S]*?\*\//g,'').trim().length > 20);
              if (!__gok2) {
                try {
                  var __embGDoc2 = inlineFromEmbeddedBundle(groupDoc);
                  if (usingFx) __embGDoc2 = exportInjectFx(__embGDoc2, cfg, true);
                  groupDoc = __embGDoc2;
                } catch(__embG2) {
                  groupDoc = injectInlineStyle(groupDoc, minimalOfflineCss());
                  if (usingFx) groupDoc = exportInjectFx(groupDoc, cfg, true);
                }
              }
            } catch (__cssomG2) {
              try {
                var __embGDoc3 = inlineFromEmbeddedBundle(groupDoc);
                if (usingFx) __embGDoc3 = exportInjectFx(__embGDoc3, cfg, true);
                groupDoc = __embGDoc3;
              } catch(__embG3) {
                groupDoc = injectInlineStyle(groupDoc, minimalOfflineCss());
                if (usingFx) groupDoc = exportInjectFx(groupDoc, cfg, true);
              }
            }
          }
        } catch (__ensureGErr) {}
        // Ensure final group snippet contains a <style> block; if missing, try CSSOM then minimal fallback
        try {
          if (!/<style[\s>]/i.test(String(groupDoc))) {
            try {
              var __cssomGroup2 = await inlineFromCssomBundle(groupDoc);
              if (usingFx) __cssomGroup2 = exportInjectFx(__cssomGroup2, cfg, true);
              groupDoc = __cssomGroup2;
            } catch (__cssomG2) {
              try {
                var __embGDoc4 = inlineFromEmbeddedBundle(groupDoc);
                if (usingFx) __embGDoc4 = exportInjectFx(__embGDoc4, cfg, true);
                groupDoc = __embGDoc4;
              } catch(__embG4) {
                groupDoc = injectInlineStyle(groupDoc, minimalOfflineCss());
                if (usingFx) groupDoc = exportInjectFx(groupDoc, cfg, true);
              }
            }
          }
        } catch (__ensureGErr) {}
    
        // Live-preview consistency enforcement: replace wrapper class/style and inject computed fonts
        try {
          if (Ny && Ny.Params && typeof Ny.Params.collectStatusbarEdits === 'function') {
            var __live = Ny.Params.collectStatusbarEdits({ feedback: false });
            if (__live && __live.audit && Array.isArray(__live.audit.ui) && __live.audit.ui.length) {
              var __snap = __live.audit.ui[__live.audit.ui.length - 1] || {};
              var __fonts = __live.computedFonts || null;
              function __escAttr(v){ return String(v == null ? '' : v).replace(/"/g, '&quot;'); }
              function __applyToDoc(doc, snap, fonts){
                try{
                  var s = String(doc || '');
                  var m = s.match(/<section\b[^>]*\bid=["']ny-status["'][^>]*>/i);
                  if (m){
                    var tag = m[0];
                    var newTag = tag;
                    if (snap && snap.className){
                      if (/\bclass\s*=/.test(newTag)) newTag = newTag.replace(/\bclass\s*=\s*["'][^"']*["']/i, 'class="' + __escAttr(snap.className) + '"');
                      else newTag = newTag.replace(/>$/, ' class="' + __escAttr(snap.className) + '">');
                    }
                    if (snap && snap.style){
                      if (/\bstyle\s*=/.test(newTag)) newTag = newTag.replace(/\bstyle\s*=\s*["'][^"']*["']/i, 'style="' + __escAttr(snap.style) + '"');
                      else newTag = newTag.replace(/>$/, ' style="' + __escAttr(snap.style) + '">');
                    }
                    s = s.replace(tag, newTag);
                  }
                  if (fonts && (fonts.wrapper || fonts.title || fonts.label || fonts.value)){
                    var css = [];
                    if (fonts.wrapper) css.push('#ny-status{font-family:' + fonts.wrapper + ' !important;}');
                    if (fonts.title) css.push('#ny-status .st-title{font-family:' + fonts.title + ' !important;}');
                    if (fonts.label) css.push('#ny-status .st-label{font-family:' + fonts.label + ' !important;}');
                    if (fonts.value) css.push('#ny-status .st-value{font-family:' + fonts.value + ' !important;}');
                    if (css.length){
                      var __block = css.join('\n').replace(/<\/style>/gi, '</s' + 'tyle>');
                      if (/<style\s+id=["']ny-live-overrides["']>/i.test(s)) {
                        s = s.replace(/<style\s+id=["']ny-live-overrides["']>([\s\S]*?)<\/style>/i, function(_, old){ return '<style id="ny-live-overrides">' + old + '\n' + __block + '</style>'; });
                      } else {
                        s = s.replace(/<\/head>/i, '<style id="ny-live-overrides">' + __block + '</style></head>');
                      }
                    }
                  }
                  return s;
                }catch(_e){ return doc; }
              }
              htmlDoc = __applyToDoc(htmlDoc, __snap, __fonts);
              groupDoc = __applyToDoc(groupDoc, __snap, __fonts);
            }
          }
        } catch(__liveErr){ try{ console.warn('[Ny.Export] live consistency override failed', __liveErr);}catch(_e){} }

        // Fallback: ensure exported HTML has a working region toggle handler even if runtime script injection fails
        function __ensureRegionToggle(docStr){
          try{
            var s = String(docStr || '');
            if (s.indexOf('.st-region-header') === -1) return s;
            if (/\b__nyExportRTBound\b/.test(s)) return s;
            var rt = "(function(){try{if(window.__nyExportRTBound)return;window.__nyExportRTBound=true;if(document.querySelector&&document.querySelector('.st-region-header[onclick]')){try{console.debug('[ny-export] delegated toggler skipped: inline onclick detected');}catch(_lg){}return;}document.addEventListener('click',function(e){try{var hdr=e.target&&e.target.closest?e.target.closest('.st-region-header'):null;if(!hdr)return;var mode=(hdr.getAttribute('data-toggle-mode')||'header');if(mode==='title'&&!(e.target&&e.target.closest&&e.target.closest('.st-region-title')))return;if(mode==='icon'&&!(e.target&&e.target.closest&&e.target.closest('.st-region-toggle')))return;var box=hdr.closest?hdr.closest('.st-region'):null;if(!box)return;var body=box.querySelector('.st-region-body');var isCollapsed=box.classList.contains('collapsed');function clsForCombo(c,ph){var out=['region-body-anim'];c=String(c||'').toLowerCase();if(c.indexOf('fade')>=0)out.push(ph==='enter'?'body-enter-fade':'body-exit-fade');if(c.indexOf('slide-down')>=0)out.push(ph==='enter'?'body-enter-slide-down':'body-exit-slide-down');if(c.indexOf('slide-up')>=0)out.push(ph==='enter'?'body-enter-slide-up':'body-exit-slide-up');if(c.indexOf('zoom-in')>=0)out.push(ph==='enter'?'body-enter-zoom-in':'body-exit-zoom-in');if(c.indexOf('zoom-out')>=0)out.push(ph==='enter'?'body-enter-zoom-out':'body-exit-zoom-out');return out;}function cleanup(el,cls){try{(cls||[]).forEach(function(c){el.classList.remove(c);});}catch(_e){}}var enter=(body&&body.getAttribute('data-enter'))||'slide-down+fade';var exit=(body&&body.getAttribute('data-exit'))||'slide-up+fade';var iconEl=hdr.querySelector('.st-region-toggle');var exp='▾',col='▶';if(iconEl){var txt=(iconEl.textContent||'').trim();if(txt==='+'||txt==='−'){exp='−';col='+';}else if(txt==='→'||txt==='↓'){exp='↓';col='→';}}var styleKind=hdr.getAttribute('data-exp-style')||'flip3d';var expDur=parseFloat(hdr.getAttribute('data-exp-dur')||'0.8')||0.8;var expInt=parseFloat(hdr.getAttribute('data-exp-int')||'0.6')||0.6;var cbg=(hdr.getAttribute('data-cbg-mode')||'none');if(!body){var next=!isCollapsed;box.classList.toggle('collapsed',next);if(iconEl)iconEl.textContent=next?col:exp;if(next){if(cbg==='glass'){hdr.style.background='';hdr.classList.add('hdr-mode-glass');}}else{hdr.classList.remove('hdr-mode-glass');hdr.style.background='';}return;}if(!isCollapsed){var exitCls=clsForCombo(exit,'exit');exitCls.forEach(function(c){body.classList.add(c);});try{hdr.style.setProperty('--exp-dur',String(expDur)+'s');hdr.style.setProperty('--exp-int',String(expInt));}catch(_eS){}var hCls='region-collapse-'+styleKind;try{hdr.classList.add(hCls);}catch(_eC){}try{hdr.addEventListener('animationend',function once(){try{hdr.removeEventListener('animationend',once);}catch(_r){}try{hdr.classList.remove(hCls);}catch(_eR){}},{once:true});}catch(_eH){}try{body.addEventListener('animationend',function once2(){try{body.removeEventListener('animationend',once2);}catch(_r){}cleanup(body,exitCls);box.classList.add('collapsed');body.style.display='none';if(iconEl)iconEl.textContent=col;if(cbg==='glass'){hdr.style.background='';hdr.classList.add('hdr-mode-glass');}}, {once:true});}catch(_e2){box.classList.add('collapsed');body.style.display='none';if(iconEl)iconEl.textContent=col;if(cbg==='glass'){hdr.style.background='';hdr.classList.add('hdr-mode-glass');}}}else{box.classList.remove('collapsed');hdr.classList.remove('hdr-mode-glass');hdr.style.background='';body.style.display='';if(iconEl)iconEl.textContent=exp;try{hdr.style.setProperty('--exp-dur',String(expDur)+'s');hdr.style.setProperty('--exp-int',String(expInt));}catch(_eS2){}var hCls2='region-expand-'+styleKind;try{hdr.classList.add(hCls2);}catch(_eC2){}try{hdr.addEventListener('animationend',function once3(){try{hdr.removeEventListener('animationend',once3);}catch(_r){}try{hdr.classList.remove(hCls2);}catch(_eR2){}},{once:true});}catch(_eH2){}var enterCls=clsForCombo(enter,'enter');enterCls.forEach(function(c){body.classList.add(c);});try{body.addEventListener('animationend',function once4(){try{body.removeEventListener('animationend',once4);}catch(_r){}cleanup(body,enterCls);},{once:true});}catch(_e3){cleanup(body,enterCls);}}}catch(_e){}},false);}catch(_e){}})();";
            return s.replace('</body>', '<script>'+ rt.replace(/<\/script>/g,'</scr'+'ipt>') +'</script>\n</body>');
          } catch(_e){ return docStr; }
        }
        // Apply fallback to both HTML and group snippet
        htmlDoc = __ensureRegionToggle(htmlDoc);
        groupDoc = __ensureRegionToggle(groupDoc);
        // Collapse animation timeout fallback (ensures no placeholder height if animationend doesn't fire)
        htmlDoc = __injectCollapseTimeoutFallback(htmlDoc);
        groupDoc = __injectCollapseTimeoutFallback(groupDoc);

        // 让“实时HTML（静态化）”也可点击折叠/展开：
        // toStaticHtml() 会移除 <script> 与大部分内联事件，但会保留以 "(function(bar)" 开头的 onclick。
        // 因此为 .st-region-header 注入符合该模式的 inline onclick，以便在纯静态环境也能工作。
        function __injectRegionInlineOnclick(docStr){
          try{
            var s = String(docStr || '');
            if (s.indexOf('st-region-header') === -1) return s;
            // 🔧 FIX: HTML实体编码函数,防止特殊字符破坏onclick属性
            function escHtml(str){
              return String(str||'').replace(/&/g,'&amp;').replace(/'/g,'&#39;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            }
            s = s.replace(/(<div\b)([^>]*\bclass=["'][^"']*\bst-region-header\b[^"']*["'][^>]*)(>)/ig, function(_, p1, attrs, p3){
              if (/onclick\s*=/.test(attrs)) return p1 + attrs + p3;
              // 🔧 改用双引号包裹onclick,内部JavaScript使用单引号(避免转义冲突)
              var code = "(function(bar){try{var e=event||window.event;var hdr=bar;var mode=(hdr.getAttribute('data-toggle-mode')||'header');if(mode==='title'&&!(e&&e.target&&e.target.closest&&e.target.closest('.st-region-title')))return;if(mode==='icon'&&!(e&&e.target&&e.target.closest&&e.target.closest('.st-region-toggle')))return;var box=hdr.closest?hdr.closest('.st-region'):null;if(!box)return;var body=box.querySelector('.st-region-body');var isCol=box.classList.contains('collapsed');try{console.debug('[ny-export] inline toggler click; collapsed:',isCol);}catch(_lg){}function cls(c,p){var out=['region-body-anim'];c=String(c||'').toLowerCase();if(c.indexOf('fade')>=0)out.push(p==='enter'?'body-enter-fade':'body-exit-fade');if(c.indexOf('slide-down')>=0)out.push(p==='enter'?'body-enter-slide-down':'body-exit-slide-down');if(c.indexOf('slide-up')>=0)out.push(p==='enter'?'body-enter-slide-up':'body-exit-slide-up');if(c.indexOf('zoom-in')>=0)out.push(p==='enter'?'body-enter-zoom-in':'body-exit-zoom-in');if(c.indexOf('zoom-out')>=0)out.push(p==='enter'?'body-enter-zoom-out':'body-exit-zoom-out');return out;}function cleanup(el,cs){try{(cs||[]).forEach(function(c){el.classList.remove(c);});}catch(_e){}}var enter=(body&&body.getAttribute('data-enter'))||'slide-down+fade';var exit=(body&&body.getAttribute('data-exit'))||'slide-up+fade';var icon=hdr.querySelector('.st-region-toggle');var exp='▾',col='▶';var txt=(icon&&icon.textContent||'').trim();if(txt==='+'||txt==='−'){exp='−';col='+';}else if(txt==='→'||txt==='↓'){exp='↓';col='→';}var styleKind=hdr.getAttribute('data-exp-style')||'flip3d';var expDur=parseFloat(hdr.getAttribute('data-exp-dur')||'0.8')||0.8;var expInt=parseFloat(hdr.getAttribute('data-exp-int')||'0.6')||0.6;var cbg=(hdr.getAttribute('data-cbg-mode')||'none');if(!body){var next=!isCol;box.classList.toggle('collapsed',next);if(icon)icon.textContent=next?col:exp;if(next){if(cbg==='glass'){hdr.style.background='';hdr.classList.add('hdr-mode-glass');}}else{hdr.classList.remove('hdr-mode-glass');hdr.style.background='';}return;}if(!isCol){var exitCls=cls(exit,'exit');exitCls.forEach(function(c){body.classList.add(c);});try{hdr.style.setProperty('--exp-dur',String(expDur)+'s');hdr.style.setProperty('--exp-int',String(expInt));}catch(_eS){}var hcls='region-collapse-'+styleKind;try{hdr.classList.add(hcls);}catch(_eC){}try{hdr.addEventListener('animationend',function once(){try{hdr.removeEventListener('animationend',once);}catch(_r){}try{hdr.classList.remove(hcls);}catch(_eR){}},{once:true});}catch(_eH){}try{body.addEventListener('animationend',function once2(){try{body.removeEventListener('animationend',once2);}catch(_r){}cleanup(body,exitCls);box.classList.add('collapsed');body.style.display='none';if(icon)icon.textContent=col;if(cbg==='glass'){hdr.style.background='';hdr.classList.add('hdr-mode-glass');}},{once:true});}catch(_e2){box.classList.add('collapsed');body.style.display='none';if(icon)icon.textContent=col;if(cbg==='glass'){hdr.style.background='';hdr.classList.add('hdr-mode-glass');}}}else{box.classList.remove('collapsed');hdr.classList.remove('hdr-mode-glass');hdr.style.background='';if(body)body.style.display='';if(icon)icon.textContent=exp;try{hdr.style.setProperty('--exp-dur',String(expDur)+'s');hdr.style.setProperty('--exp-int',String(expInt));}catch(_eS2){}var hcls2='region-expand-'+styleKind;try{hdr.classList.add(hcls2);}catch(_eC2){}try{hdr.addEventListener('animationend',function once3(){try{hdr.removeEventListener('animationend',once3);}catch(_r){}try{hdr.classList.remove(hcls2);}catch(_eR2){}},{once:true});}catch(_eH2){}var enterCls=cls(enter,'enter');enterCls.forEach(function(c){body.classList.add(c);});try{body.addEventListener('animationend',function once4(){try{body.removeEventListener('animationend',once4);}catch(_r){}cleanup(body,enterCls);},{once:true});}catch(_e3){cleanup(body,enterCls);}}}catch(_e){}})(this)";
              // 🔧 对整个onclick代码进行HTML实体编码,确保特殊字符不会破坏属性
              return p1 + attrs + ' onclick="' + escHtml(code) + '"' + p3;
            });
            return s;
          } catch(_e){ return docStr; }
        }
        // Runtime collapse timeout fallback: ensure collapsed state finalizes even if animationend does not fire
        function __injectCollapseTimeoutFallback(docStr){
          try{
            var s = String(docStr || '');
            if (s.indexOf('.st-region-header') === -1) return s;
            if (/\b__nyCollapseTimeoutBound\b/.test(s)) return s;
            var js = [
              '(function(){try{',
              'if(window.__nyCollapseTimeoutBound) return;',
              'window.__nyCollapseTimeoutBound = true;',
              'document.addEventListener("click", function(e){try{',
              '  var hdr = e.target && e.target.closest ? e.target.closest(".st-region-header") : null;',
              '  if(!hdr) return;',
              '  var mode = (hdr.getAttribute("data-toggle-mode") || "header");',
              '  if(mode === "title" && !(e && e.target && e.target.closest && e.target.closest(".st-region-title"))) return;',
              '  if(mode === "icon" && !(e && e.target && e.target.closest && e.target.closest(".st-region-toggle"))) return;',
              '  var box = hdr.closest ? hdr.closest(".st-region") : null;',
              '  var body = box ? box.querySelector(".st-region-body") : null;',
              '  var expDur = 0.8;',
              '  try{',
              '    var cs = getComputedStyle(hdr);',
              '    var d = parseFloat((cs.getPropertyValue("--exp-dur") || "").replace("s",""));',
              '    if (isFinite(d) && d > 0) expDur = d;',
              '  }catch(_e){}',
              '  var timeout = Math.max(0, Math.min(3000, Math.round(expDur * 1000 + 120)));',
              '  var fired = false;',
              '  var mark = function(){ fired = true; };',
              '  hdr.addEventListener("animationend", mark, { once: true });',
              '  setTimeout(function(){ try{',
              '    if(fired) return;',
              '    if(!box) return;',
              '    var isCol = box.classList.contains("collapsed");',
              '    if(isCol){ box.classList.add("collapsed"); if(body) body.style.display = "none"; }',
              '    else { box.classList.remove("collapsed"); if(body) body.style.display = ""; }',
              '  }catch(_ee){} }, timeout);',
              '}catch(_err){}}, true);',
              '}catch(_err2){}})();'
            ].join('\\n');
            return s.replace('</body>', '<script>' + js.replace('</script>', '</scr' + 'ipt>') + '</script>\n</body>');
          }catch(_e){ return String(docStr || ''); }
        }

        htmlDoc = __injectRegionInlineOnclick(htmlDoc);
        groupDoc = __injectRegionInlineOnclick(groupDoc);

        // 去重：清理 ny-live-overrides 末尾重复的字体规则，保留“最后一次”的一份
        function __dedupeNyLiveOverrides(docStr){
          try{
            var s = String(docStr || '');
            var m = s.match(/<style\s+id=["']ny-live-overrides["']>([\s\S]*?)<\/style>/i);
            if (!m) return s;
            var full = m[0], body = m[1];
            var lines = body.split('\n');
            var drop = {};
            var seen = {};
            for (var i = lines.length - 1; i >= 0; i--) {
              var L = lines[i];
              var mm = L && L.match(/^\s*(#ny-status(?:\s+\.st-(?:title|label|value))?)\s*\{\s*font-family\s*:[^}]+\}\s*;?\s*$/i);
              if (mm) {
                var key = mm[1].replace(/\s+/g,' ').toLowerCase();
                if (seen[key]) {
                  drop[i] = true;
                } else {
                  seen[key] = true;
                }
              }
            }
            var newBody = lines.filter(function(_, idx){ return !drop[idx]; }).join('\n');
            return s.replace(full, '<style id="ny-live-overrides">' + newBody + '</style>');
          } catch(_e){ return String(docStr || ''); }
        }
        htmlDoc = __dedupeNyLiveOverrides(htmlDoc);
        groupDoc = __dedupeNyLiveOverrides(groupDoc);

        var originalDoc = (function(doc, tpl){
          try{
            var s = String(doc);
            if (s.indexOf('$1') !== -1) {
              return s.replace('$1', tpl);
            }
            var block = '<template id="ny-ai-template" data-ny="ai-template">' + tpl + '</template>';
            return s.replace('</body>', block + '\n</body>');
          } catch(_e) {
            return String(doc);
          }
        })(htmlDoc, outs.aiTemplate);
    
        setValue('statusbar-code', htmlDoc);
        // 实时窗口同步：模态中的实时 HTML 文本域（输出“纯静态 HTML”：去除模板标记与所有脚本/事件）
        setValue('statusbar-code-live', toStaticHtml(htmlDoc));
        setValue('regex-recipe', outs.regexReference);
        setValue('original-code', originalDoc);
        setValue('ai-template', outs.aiTemplate);
        setValue('ai-template-inline', outs.aiTemplate);
    
        var findStr = (typeof outs.findRegex === 'string') ? outs.findRegex : (outs.findRegex && outs.findRegex.pattern ? outs.findRegex.pattern : '');
        setValue('find-regex', findStr);
        setClip('btn-copy-find-raw', findStr);
        setClip('btn-copy-find-json', toJson(findStr));
    
        // replaceString 由“状态栏 HTML（实时生成→静态化）”直接构造，仅“值”用 $n 占位，其余完全一致
        var replaceRaw;
        try {
          replaceRaw = __buildReplaceFromLiveHtml(toStaticHtml(htmlDoc));
        } catch(__repErr) {
          replaceRaw = groupDoc; // 回退：保留原静态分组片段
        }
        var replaceFenced = '```\n' + replaceRaw + '\n```';
        setValue('replace-string', replaceRaw);
        setClip('btn-copy-rep-raw', replaceRaw);
        setClip('btn-copy-rep-fenced', replaceFenced);
        setClip('btn-copy-rep-raw-json', toJson(replaceRaw));
        setClip('btn-copy-rep-fenced-json', toJson(replaceFenced));
    
        var dlBtn = document.getElementById('btn-download-json');
        if (dlBtn && !dlBtn.__nyBound) {
          dlBtn.__nyBound = true;
          dlBtn.addEventListener('click', async function () { try { await downloadJSON(); } catch (_e) {} });
        }
      } catch (e) {
        try { showErrorModal('生成代码失败', e); } catch(_e){}
      }
    }
    
    function setupAutoSync(){
      ensure();
      try {
        var preview = document.getElementById('live-preview-container');
        var modal = document.getElementById('code-modal');
        if (!preview) return;
    
        try { if (autoSyncMO && autoSyncMO.disconnect) autoSyncMO.disconnect(); } catch(_e){}
    
        // 修复：提供正确的 MutationObserver fallback
        var MO = window.MutationObserver || window.WebKitMutationObserver || function() {
          this.observe = function() {};
          this.disconnect = function() {};
        };
        try {
          autoSyncMO = new MO(function(){
            try {
              if (!modal || modal.style.display !== 'flex') return;
              if (autoSyncTimer) clearTimeout(autoSyncTimer);
              autoSyncTimer = setTimeout(function(){ refreshOutputs(true, { inlineGroup: true }); }, 180);
            } catch(_e){}
          });
          // 同步监听节点增删与样式/类名变化，确保 CSS 变量与内联 style 变化也能触发导出刷新
          autoSyncMO.observe(preview, { childList: true, subtree: true, attributes: true, attributeFilter: ['style','class'] });
          try {
            var __pw = preview.querySelector('.status-preview-wrapper');
            if (__pw) {
              autoSyncMO.observe(__pw, { childList: true, subtree: true, attributes: true, attributeFilter: ['style','class'] });
            }
          } catch(_obsWrap){}
        } catch(_e){}
    
        ['input','change','click'].forEach(function(evt){
          document.addEventListener(evt, function(){
            try {
              if (!modal || modal.style.display !== 'flex') return;
              if (autoSyncTimer) clearTimeout(autoSyncTimer);
              autoSyncTimer = setTimeout(function(){ refreshOutputs(true, { inlineGroup: true }); }, 220);
            } catch(_ee){}
          }, true);
        });
      } catch (e) {
        try { console.warn('[Ny.Export] setupAutoSync warn', e); } catch(_e){}
      }
    }
    
    // Aggregated generate interface
    function generateAll(state, options) {
      return {
        html: buildReplacementHTML(state, options),
        snippet: buildGroupSnippet(state, options),
        aiTemplate: buildAiTemplate(state, options),
        findRegex: buildFindRegex(state, options),
        regexReference: buildRegexReference(state, options),
        serialized: serializeForExport(state)
      };
    }

    return {
      init: init,
      ensure: ensure,
      buildReplacementHTML: buildReplacementHTML,
      buildGroupSnippet: buildGroupSnippet,
      buildAiTemplate: buildAiTemplate,
      buildFindRegex: buildFindRegex,
      buildRegexReference: buildRegexReference,
      serializeForExport: serializeForExport,
      injectFx: exportInjectFx,
      attachGenerateButton: attachGenerateButton,
      attachCopyHandlers: attachCopyHandlers,
      openCodeModal: openCodeModal,
      closeCodeModal: closeCodeModal,
      downloadJSON: downloadJSON,
      refreshOutputs: refreshOutputs,
      generateAll: generateAll
    };
  })();

  window.addEventListener('DOMContentLoaded', function () {
    try {
      if (window.Ny && Ny.Export && Ny.Export.init) {
        Ny.Export.init();
        // 再次幂等绑定，确保在某些延迟加载场景下仍能接管按钮事件
        try { Ny.Export.attachGenerateButton(); } catch (_e1) {}
        try { Ny.Export.attachCopyHandlers(document); } catch (_e2) {}
      }
    } catch (e) {
      console.warn('[Ny.Export] auto-init error', e);
    }
  });
})(window, document);
