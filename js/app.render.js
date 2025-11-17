(function(global){
  'use strict';
  const Ny = global.Ny || (global.Ny = {});
  Ny.Render = (function(){
    const Utils = (global.Ny && global.Ny.Utils) ? global.Ny.Utils : {};
    const State = (global.Ny && global.Ny.State) ? global.Ny.State : {};

    let previewContainer = null;

    function mount(containerEl){
      previewContainer = containerEl || previewContainer || global.document && global.document.getElementById('live-preview-container');
    }
    function ensureContainer(){
      if (!previewContainer && global.document) {
        previewContainer = global.document.getElementById('live-preview-container');
      }
      return previewContainer;
    }

    // 简化别名
    const esc = (s) => { try { return Utils.esc ? Utils.esc(s) : String(s == null ? '' : s); } catch(_e){ return String(s == null ? '' : s); } };
    const clamp = (n, min, max) => { try { return Utils.clamp ? Utils.clamp(n, min, max) : Math.max(min, Math.min(max, n)); } catch(_e){ return Math.max(min, Math.min(max, n)); } };

    function makeIconHTML(customization){
      try {
        if (!customization) return '';
        const mode = customization.iconMode || 'none';
        if (mode === 'none') return '';

        const size = customization.iconSize || 28;
        let inner = '';

        if (mode === 'built-in') {
          const svg = Utils.getBuiltinIconSVG ? Utils.getBuiltinIconSVG(customization.iconBuiltin || 'cog', size, customization.primaryColor) : '';
          inner = svg;
        } else if (mode === 'url') {
          const raw = (customization.iconUrl == null ? '' : String(customization.iconUrl)).trim();
          if (!raw) return ''; // 避免空 URL 导致初始加载出现“破图”占位
          const url = esc(raw);
          inner = `<img src="${url}" alt="" style="width:${size}px;height:${size}px;object-fit:contain;filter: drop-shadow(0 0 2px rgba(0,0,0,.3));">`;
        } else {
          return '';
        }

        // 使用 CSS 类减少内联样式
        return `
          <span class="st-header-icon" style="width:${size}px; height:${size}px;">
            ${inner}
          </span>
        `;
      } catch(_e){ return ''; }
    }

    function getHeaderHTML2(theme, title, customization){
      customization = customization || State.customization || {};
      if (customization && customization.titleEnabled === false) { try { console.log('[dbg] getHeaderHTML2: title disabled, skip render', { titleEnabled: customization.titleEnabled }); } catch(_eLog){} return ''; }
      const t = esc(title || '角色状态');

      const themeColor = (customization.primaryColor || '#ffffff');
      const mode = (customization.titleColorMode || 'theme');

      // 使用 CSS 类减少内联样式
      const titleClasses = ['st-title'];
      if (customization.titleItalic) titleClasses.push('title-italic');
      if (customization.titleUppercase) titleClasses.push('title-uppercase');

      // 只保留动态样式
      const titleStyleParts = [
        `font-size:${customization.titleFontSize || 20}px`,
        `font-weight:${parseInt(customization.titleWeight || 500, 10) || 500}`,
        (typeof customization.titleLetterSpacing === 'number' ? `letter-spacing:${customization.titleLetterSpacing}em` : '')
      ].filter(Boolean);

      if (mode === 'solid') {
        const solid = (customization.titleColorSolid && customization.titleColorSolid.trim()) ? customization.titleColorSolid.trim() : themeColor;
        titleStyleParts.push(`color:${solid}`);
      } else if (mode === 'gradient') {
        const a = (customization.titleGradStart && customization.titleGradStart.trim()) ? customization.titleGradStart.trim() : (customization.primaryColor || themeColor);
        const b = (customization.titleGradEnd && customization.titleGradEnd.trim()) ? customization.titleGradEnd.trim() : (customization.secondaryColor || themeColor);
        const ang = Number(customization.titleGradAngle ?? 0) || 0;
        titleStyleParts.push(
          `background:linear-gradient(${ang}deg, ${a}, ${b})`,
          `-webkit-background-clip:text`,
          `background-clip:text`,
          `color:transparent`
        );
      } else {
        titleStyleParts.push(`color:${themeColor}`);
      }

      // 下划线
      if ((customization.titleUnderlineStyle || 'none') !== 'none') {
        const uStyle = customization.titleUnderlineStyle || 'solid';
        const uColor = (customization.titleUnderlineColor && customization.titleUnderlineColor.trim()) ? customization.titleUnderlineColor.trim() : themeColor;
        const uThick = Math.max(1, parseInt(customization.titleUnderlineThickness || 2, 10) || 2);
        const uOffset = Math.max(0, parseInt(customization.titleUnderlineOffset || 4, 10) || 4);
        titleStyleParts.push(
          'text-decoration-line:underline',
          `text-decoration-style:${uStyle}`,
          `text-decoration-color:${uColor}`,
          `text-decoration-thickness:${uThick}px`,
          `text-underline-offset:${uOffset}px`
        );
      }

      // 特效
      const ts = [];
      if (customization.titleEffectGlow) {
        const intensity = Math.max(0, Math.min(1, Number(customization.titleGlowIntensity || 0.5)));
        const glowColor = (mode === 'solid' && customization.titleColorSolid) ? customization.titleColorSolid : themeColor;
        const r1 = (6 + 10 * intensity).toFixed(1);
        const r2 = (12 + 18 * intensity).toFixed(1);
        ts.push(`0 0 ${r1}px ${glowColor}`, `0 0 ${r2}px ${glowColor}`);
      }
      if (customization.titleEffectShadow) {
        const s = Math.max(0, Math.min(1, Number(customization.titleShadowStrength || 0.3)));
        const y = (1 + 3 * s).toFixed(1);
        const blur = (2 + 6 * s).toFixed(1);
        ts.push(`0 ${y}px ${blur}px rgba(0,0,0,${0.45 + 0.3*s})`);
      }
      if (ts.length) titleStyleParts.push(`text-shadow:${ts.join(',')}`);

      const titleInner = (theme === 'theme-cyber-grid')
        ? `<span class="${titleClasses.join(' ')}" style="${titleStyleParts.join('; ')}">[ ${t} ]</span>`
        : `<span class="${titleClasses.join(' ')}" style="${titleStyleParts.join('; ')}">${t}</span>`;

      // 徽章
      let titleSpan = titleInner;
      if (customization.titleBadgeEnabled) {
        const bColor = (customization.titleBadgeColor && customization.titleBadgeColor.trim()) ? customization.titleBadgeColor.trim() : '#000000';
        // 减少内联样式，CSS 类已包含基础样式
        const badgeStyle = `background: color-mix(in srgb, ${bColor} 30%, transparent)`;
        titleSpan = `<span class="st-title-badge" style="${badgeStyle}">${titleInner}</span>`;
      }

      // 容器样式 - 使用 CSS 类减少内联样式
      const headerClasses = ['st-header'];
      const align = customization.headerAlign || 'inherit';
      if (align === 'left') headerClasses.push('header-align-left');
      else if (align === 'center') headerClasses.push('header-align-center');
      else if (align === 'right') headerClasses.push('header-align-right');

      // 只保留动态样式
      const headerStyleParts = [];
      const mh = Math.max(0, Number(customization.headerMinHeight || 0)) || 0;
      const py = Math.max(0, Number(customization.headerPaddingY || 0)) || 0;
      const gapEnabled = !!customization.titleGapEnabled;
      const gapPx = Math.max(0, Number(customization.titleGap || 10)) || 10;
      
      if (mh > 0) headerStyleParts.push(`min-height:${mh}px`);
      if (py > 0) headerStyleParts.push(`padding-block:${py}px`);
      if (gapEnabled) headerStyleParts.push(`gap:${gapPx}px`);

      const iconHTML = makeIconHTML(customization);
      const pos = (customization.iconMode !== 'none' && (customization.iconPosition === 'none' || !customization.iconPosition))
        ? 'left'
        : (customization.iconPosition || 'none');

      let inner;
      if (pos === 'left') {
        inner = `${iconHTML}${titleSpan}`;
      } else if (pos === 'right') {
        inner = `${titleSpan}${iconHTML}`;
      } else {
        inner = `${titleSpan}`;
      }

      const headerStyle = headerStyleParts.length > 0 ? ` style="${headerStyleParts.join('; ')}"` : '';
      return `<div class="${headerClasses.join(' ')}"${headerStyle}>${inner}</div>`;
    }

    function dividerHTML(customization){
      customization = customization || State.customization || {};
      const dc = (customization.section2DividerColor && customization.section2DividerColor.trim().length > 0)
        ? customization.section2DividerColor
        : customization.primaryColor;
      if (customization.dividerStyle === 'dashed') {
        return `<hr style="border:none;border-top:1px dashed ${dc};height:0;opacity:.9;">`;
      }
      if (customization.dividerStyle === 'gradient') {
        return `<hr style="border:none;height:1px; background-image:linear-gradient(to right, transparent, ${dc}, transparent);">`;
      }
      // line
      return `<hr style="border:none;height:1px;background:${dc};">`;
    }

    function buildItemsHTML(list, theme, customization){
      customization = customization || State.customization || {};
      const pc = customization.primaryColor;
      const sc = customization.secondaryColor;
      const layout = customization.layout;

      const s2Label = customization.section2LabelColor && customization.section2LabelColor.trim().length > 0 ? customization.section2LabelColor : '';
      const s2Value = customization.section2ValueColor && customization.section2ValueColor.trim().length > 0 ? customization.section2ValueColor : '';
      const s2Bar   = customization.section2BarColor   && customization.section2BarColor.trim().length   > 0 ? customization.section2BarColor   : '';

      const styleJoin = parts => parts.filter(Boolean).join('; ');

      const labelFontFamily = customization.globalLabelFontFamily || customization.fontFamily;
      const valueFontFamily = customization.globalValueFontFamily || customization.fontFamily;
      const labelWeight = customization.globalLabelWeight || 500;
      const valueWeight = customization.globalValueWeight || 600;
      const labelFontSize = customization.globalLabelFontSize || 0;
      const valueFontSize = customization.globalValueFontSize || 0;
      const labelItalic = customization.globalLabelItalic ? 'font-style:italic' : '';
      const valueItalic = customization.globalValueItalic ? 'font-style:italic' : '';
      const labelUpper = customization.globalLabelUppercase ? 'text-transform:uppercase' : '';
      const valueUpper = customization.globalValueUppercase ? 'text-transform:uppercase' : '';
      const labelReflect = customization.globalLabelReflect ? '-webkit-box-reflect: below 0 linear-gradient(transparent, rgba(255,255,255,.15))' : '';
      const valueReflect = customization.globalValueReflect ? '-webkit-box-reflect: below 0 linear-gradient(transparent, rgba(255,255,255,.15))' : '';
      const reflectInlineBlock = 'display:inline-block';

      const barStyle = customization.barStyle || 'normal';
      const barAnimation = customization.barAnimation || 'none';
      const barClassFromStyle = () => {
        switch (barStyle) {
          case 'glow': return 'pf-glow';
          case 'striped': return 'pf-striped';
          case 'glass': return 'pf-glass';
          default: return '';
        }
      };
      const barAnimClass = barAnimation === 'grow' ? 'pf-anim-grow' : '';

      return (Array.isArray(list) ? list : []).map(it => {
        if (it.type === 'divider') return dividerHTML(customization);

        if (it.type === 'text') {
          const labelColor = s2Label || it.labelColor || sc;
          const valueColor = s2Value || it.valueColor || pc;
          
          // 使用 CSS 类减少内联样式
          const labelClasses = ['st-label'];
          if (customization.globalLabelItalic) labelClasses.push('label-italic');
          if (customization.globalLabelUppercase) labelClasses.push('label-uppercase');
          if (customization.globalLabelReflect) labelClasses.push('label-reflect');
          
          const valueClasses = ['st-value', 'st-text'];
          if (customization.globalValueItalic) valueClasses.push('value-italic');
          if (customization.globalValueUppercase) valueClasses.push('value-uppercase');
          if (customization.globalValueReflect) valueClasses.push('value-reflect');
          
          // 只保留动态颜色和字体相关的内联样式
          const lblStyle = styleJoin([
            `color:${labelColor}`,
            labelFontFamily ? `font-family:${labelFontFamily}` : '',
            `font-weight:${labelWeight}`,
            labelFontSize ? `font-size:${labelFontSize}px` : ''
          ]);
          const valStyleBase = styleJoin([
            `color:${valueColor}`,
            valueFontFamily ? `font-family:${valueFontFamily}` : '',
            `font-weight:${valueWeight}`,
            valueFontSize ? `font-size:${valueFontSize}px` : ''
          ]);
          // 使用 CSS 类减少内联样式
          let itemClass = 'st-item';
          let valueTextAlign = '';
          
          if (layout === 'two-column') {
            itemClass += ' layout-two-column';
            valueTextAlign = 'text-align:left;';
            return `
              <div class="${itemClass}">
                <div class="${labelClasses.join(' ')}" style="${lblStyle}">${esc(it.label || '')}</div>
                <div class="${valueClasses.join(' ')}" style="${valStyleBase}; ${valueTextAlign}">${esc(it.value || '')}</div>
              </div>
            `;
          }
          if (layout === 'stacked') {
            itemClass += ' layout-stacked';
            valueTextAlign = 'text-align:right;';
          } else if (layout === 'center') {
            itemClass += ' layout-center';
            valueTextAlign = 'text-align:center;';
          } else if (layout === 'label-left') {
            itemClass += ' layout-label-left';
            valueTextAlign = 'text-align:right;';
          } else if (layout === 'reverse') {
            itemClass += ' layout-reverse';
            valueTextAlign = 'text-align:left;';
          } else {
            itemClass += ' layout-flex-between';
            valueTextAlign = 'text-align:right;';
          }
          
          if (layout === 'stacked' || layout === 'center') {
            return `
              <div class="${itemClass}">
                <div class="${labelClasses.join(' ')}" style="${lblStyle}">${esc(it.label || '')}</div>
                <div class="${valueClasses.join(' ')}" style="${valStyleBase}; ${valueTextAlign}">${esc(it.value || '')}</div>
              </div>
            `;
          } else if (layout === 'reverse') {
            return `
              <div class="${itemClass}">
                <div class="${valueClasses.join(' ')}" style="${valStyleBase}; ${valueTextAlign}">${esc(it.value || '')}</div>
                <div class="${labelClasses.join(' ')}" style="${lblStyle}">${esc(it.label || '')}</div>
              </div>
            `;
          } else {
            return `
              <div class="${itemClass}">
                <div class="${labelClasses.join(' ')}" style="${lblStyle}">${esc(it.label || '')}</div>
                <div class="${valueClasses.join(' ')}" style="${valStyleBase}; ${valueTextAlign}">${esc(it.value || '')}</div>
              </div>
            `;
          }
        }

        if (it.type === 'longtext') {
          const labelColor = s2Label || it.labelColor || sc;
          const valueColor = s2Value || it.valueColor || pc;
          
          // 使用 CSS 类减少内联样式
          const labelClasses = ['st-label'];
          if (customization.globalLabelItalic) labelClasses.push('label-italic');
          if (customization.globalLabelUppercase) labelClasses.push('label-uppercase');
          if (customization.globalLabelReflect) labelClasses.push('label-reflect');
          
          const valueClasses = ['st-value', 'st-longtext'];
          if (customization.globalValueItalic) valueClasses.push('value-italic');
          if (customization.globalValueUppercase) valueClasses.push('value-uppercase');
          if (customization.globalValueReflect) valueClasses.push('value-reflect');
          
          // 只保留动态颜色和字体相关的内联样式
          const lblStyle = styleJoin([
            `color:${labelColor}`,
            labelFontFamily ? `font-family:${labelFontFamily}` : '',
            `font-weight:${labelWeight}`,
            labelFontSize ? `font-size:${labelFontSize}px` : ''
          ]);
          const valStyleBase = styleJoin([
            `color:${valueColor}`,
            valueFontFamily ? `font-family:${valueFontFamily}` : '',
            `font-weight:${valueWeight}`,
            valueFontSize ? `font-size:${valueFontSize}px` : ''
          ]);
          const spanAll = (customization.layout === 'two-column') ? 'grid-column: 1 / -1;' : '';
          const eff = it.ltEffect || 'none';
          const lh = (typeof it.ltLineHeight === 'number' ? it.ltLineHeight : 1.6);
          
          // 新增：按项目独立的首字缩进与四边距（仅长文字）
          const indent = isFinite(it.ltFirstIndentPx) ? Math.max(0, Number(it.ltFirstIndentPx)) : 0;
          const pTop = isFinite(it.ltPadTopPx) ? Math.max(0, Number(it.ltPadTopPx)) : 0;
          const pRight = isFinite(it.ltPadRightPx) ? Math.max(0, Number(it.ltPadRightPx)) : 0;
          const pBottom = isFinite(it.ltPadBottomPx) ? Math.max(0, Number(it.ltPadBottomPx)) : 0;
          const pLeft = isFinite(it.ltPadLeftPx) ? Math.max(0, Number(it.ltPadLeftPx)) : 0;
          const skipFirst = !!it.ltSkipFirstLine;
          
          // 容器样式（不包含 text-indent，由段落独立控制）
          const containerStyle = [
            valStyleBase,
            `line-height:${lh}`,
            // 统一与导出一致：不保留容器级 pre-wrap，避免模板换行成为可视空行
            `white-space:normal`,
            `padding-top:${pTop}px`,
            `padding-right:${pRight}px`,
            `padding-bottom:${pBottom}px`,
            `padding-left:${pLeft}px`
          ].filter(Boolean).join('; ');
          
          // 段落分割与渲染
          const rawText = it.value || '';
          const paragraphs = rawText.split('\n');
          
          let contentHTML = '';
          
          if (eff === 'typewriter') {
            // 打字机效果：保持整体文本，但使用段落结构支持缩进
            const spd = isFinite(it.ltTwSpeedMs) ? Math.max(5, Math.min(200, Number(it.ltTwSpeedMs))) : 18;
            const dly = isFinite(it.ltTwDelayMs) ? Math.max(0, Number(it.ltTwDelayMs)) : 0;
            const caret = (it.ltTwCaret !== false) ? '1' : '0';
            const effAttr = ` data-effect="typewriter" data-tw-speed="${spd}" data-tw-delay="${dly}" data-tw-caret="${caret}"`;
            const dataSkip = skipFirst ? ' data-lt-skip-first="1"' : '';
            const effClass = ' anim-typewriter';
            
            // 为打字机效果生成段落HTML，每段独立缩进
            contentHTML = paragraphs.map((para, idx) => {
              const shouldIndent = !(idx === 0 && skipFirst);
              const pStyle = `margin:0; padding:0; text-indent:${shouldIndent ? indent : 0}px;`;
              return `<p style="${pStyle}">${esc(para)}</p>`;
            }).join('');
            
            return `
              <div class="st-item" style="display:block; ${spanAll}">
                <div class="${labelClasses.join(' ')}" style="${lblStyle}">${esc(it.label || '')}</div>
                <div class="${valueClasses.join(' ')}${effClass}"${effAttr}${dataSkip} style="${containerStyle}">
                  ${contentHTML}
                </div>
              </div>
            `;
          } else {
            // 普通效果（fade/slide/none）：按段落分割渲染
            const effClass = (eff === 'fade' ? ' anim-fade-in' : (eff === 'slide' ? ' anim-slide-up' : ''));
            
            // 为每个段落生成独立的 <p> 元素，应用首字缩进
            contentHTML = paragraphs.map((para, idx) => {
              const shouldIndent = !(idx === 0 && skipFirst);
              const pStyle = `margin:0; padding:0; text-indent:${shouldIndent ? indent : 0}px;`;
              return `<p style="${pStyle}">${esc(para)}</p>`;
            }).join('');
            
            return `
              <div class="st-item" style="display:block; ${spanAll}">
                <div class="${labelClasses.join(' ')}" style="${lblStyle}">${esc(it.label || '')}</div>
                <div class="${valueClasses.join(' ')}${effClass}" style="${containerStyle}">
                  ${contentHTML}
                </div>
              </div>
            `;
          }
        }

        if (it.type === 'bar') {
          const p = clamp(parseInt(it.percent ?? 0, 10) || 0, 0, 100);
          const labelColor = s2Label || it.labelColor || sc;
          const fillColor  = s2Bar   || it.barColor || '';
          
          // 使用 CSS 类减少内联样式
          const labelClasses = ['st-label'];
          if (customization.globalLabelItalic) labelClasses.push('label-italic');
          if (customization.globalLabelUppercase) labelClasses.push('label-uppercase');
          if (customization.globalLabelReflect) labelClasses.push('label-reflect');
          
          const valueClasses = ['st-value'];
          if (customization.globalValueItalic) valueClasses.push('value-italic');
          if (customization.globalValueUppercase) valueClasses.push('value-uppercase');
          if (customization.globalValueReflect) valueClasses.push('value-reflect');
          
          const classList = ['st-progress-bar-fill'];
          const styleParts = [];
          if (barAnimClass) classList.push(barAnimClass);
          const styleWidth = barAnimClass ? `width: var(--target); --target: ${p}%` : `width: ${p}%`;
          styleParts.push(styleWidth);
          if (fillColor) {
            styleParts.push(`background: ${esc(fillColor)}`);
            styleParts.push(`--bar-color: ${esc(fillColor)}`);
          } else {
            styleParts.push(`background: linear-gradient(90deg, ${pc}, ${sc})`);
            styleParts.push(`--bar-color: ${State && State.getBarColor ? State.getBarColor(customization) : (typeof pc === 'string' && pc.trim() ? pc.trim() : '#6a717c')}`);
          }
          const fillStyle = `style="${styleParts.join('; ')}"`;
          const extraStyleClass = barClassFromStyle();
          if (extraStyleClass) classList.push(extraStyleClass);

          // 只保留动态颜色和字体相关的内联样式
          const lblStyle = styleJoin([
            `color:${labelColor}`,
            labelFontFamily ? `font-family:${labelFontFamily}` : '',
            `font-weight:${labelWeight}`,
            labelFontSize ? `font-size:${labelFontSize}px` : ''
          ]);
          const valStyle = styleJoin([
            valueFontFamily ? `font-family:${valueFontFamily}` : '',
            `font-weight:${valueWeight}`,
            valueFontSize ? `font-size:${valueFontSize}px` : ''
          ]);

          // 使用 CSS 类减少内联样式
          let itemClass = 'st-item';
          // 补全宽度与偏移样式，确保导出时 CSS 变量生效
          const valueWidthStyle = 'width: clamp(120px, 40vw, calc(var(--_vb-base-max, 160px) * var(--vb-width-pct, 100) / 100)); transform: translateX(calc(1% * var(--vb-offset-pct, 0)));';
          
          if (layout === 'stacked') {
            itemClass += ' layout-stacked';
          } else if (layout === 'center') {
            itemClass += ' layout-center';
          } else if (layout === 'label-left') {
            itemClass += ' layout-label-left';
          } else if (layout === 'reverse') {
            itemClass += ' layout-reverse';
          } else {
            itemClass += ' layout-flex-between';
          }

          if (layout === 'stacked' || layout === 'center') {
            return `
              <div class="${itemClass}">
                <div class="${labelClasses.join(' ')}" style="${lblStyle}">${esc(it.label || '')}</div>
                <div class="${valueClasses.join(' ')}" style="${valueWidthStyle} ${valStyle}">
                  <div class="st-progress-bar" onclick="(function(bar){var s=bar.querySelector('.st-progress-percent');var show=!(bar.classList&&bar.classList.contains('show-percent'));if(bar.classList)bar.classList.toggle('show-percent',show);if(s){s.style.opacity=show?'1':'0';}})(this)">
                    <div class="${classList.join(' ')}" ${fillStyle}></div><span class="st-progress-percent" style="--pct:${p}%;">${p}%</span>
                  </div>
                </div>
              </div>
            `;
          } else if (layout === 'reverse') {
            return `
              <div class="${itemClass}">
                <div class="${valueClasses.join(' ')}" style="${valueWidthStyle} ${valStyle}">
                  <div class="st-progress-bar" onclick="(function(bar){var s=bar.querySelector('.st-progress-percent');var show=!(bar.classList&&bar.classList.contains('show-percent'));if(bar.classList)bar.classList.toggle('show-percent',show);if(s){s.style.opacity=show?'1':'0';}})(this)">
                    <div class="${classList.join(' ')}" ${fillStyle}></div><span class="st-progress-percent" style="--pct:${p}%;">${p}%</span>
                  </div>
                </div>
                <div class="${labelClasses.join(' ')}" style="${lblStyle}">${esc(it.label || '')}</div>
              </div>
            `;
          } else {
            return `
              <div class="${itemClass}">
                <div class="${labelClasses.join(' ')}" style="${lblStyle}">${esc(it.label || '')}</div>
                <div class="${valueClasses.join(' ')}" style="${valueWidthStyle} ${valStyle}">
                  <div class="st-progress-bar" onclick="(function(bar){var s=bar.querySelector('.st-progress-percent');var show=!(bar.classList&&bar.classList.contains('show-percent'));if(bar.classList)bar.classList.toggle('show-percent',show);if(s){s.style.opacity=show?'1':'0';}})(this)">
                    <div class="${classList.join(' ')}" ${fillStyle}></div><span class="st-progress-percent" style="--pct:${p}%;">${p}%</span>
                  </div>
                </div>
              </div>
            `;
          }
        }

        return '';
      }).join('');
    }

    // 背景层与组件（临时：后续迁移 Ny.Bg）
    function buildBgLayersHTML(layers, customization){
      customization = customization || State.customization || {};
      try{
        const L = Array.isArray(layers) ? layers : [];
        if (!L.length) return '';
        const html = L.map(l => {
          const op = isFinite(l?.opacity) ? Math.max(0, Math.min(1, Number(l.opacity))) : 1;
          if (l?.type === 'color') {
            const color = esc(l.color || '#000000');
            return `<div class="bg-layer" style="background:${color};opacity:${op};"></div>`;
          }
          if (l?.type === 'gradient') {
            const style = String(l.style || 'linear');
            const angle = Number(l.angle ?? 135) || 135;
            const dir = String(l.direction || 'to bottom right');
            const start = esc(l.start || customization.primaryColor || '#6a717c');
            const end = esc(l.end || customization.secondaryColor || '#97aec8');
            let grad;
            if (style === 'linear') {
              grad = `linear-gradient(${angle}deg, ${start}, ${end})`;
            } else if (style === 'radial') {
              const pos = dir.replace(/^to\s+/, '');
              grad = `radial-gradient(at ${pos}, ${start}, ${end})`;
            } else if (style === 'conic') {
              const pos = dir.replace(/^to\s+/, '');
              grad = `conic-gradient(from ${angle}deg at ${pos}, ${start}, ${end})`;
            } else {
              grad = `linear-gradient(${angle}deg, ${start}, ${end})`;
            }
            return `<div class="bg-layer" style="background:${grad};opacity:${op};"></div>`;
          }
          const src = esc(l?.src || '');
          const size = esc(l?.size || 'cover');
          const pos = esc(l?.position || 'center');
          const rep = esc(l?.repeat || 'no-repeat');
          return `<div class="bg-layer" style="background-image:url('${src}');background-size:${size};background-position:${pos};background-repeat:${rep};opacity:${op};"></div>`;
        }).join('');
        return `<div class="bg-layers">${html}</div>`;
      }catch(_e){ return ''; }
    }
    function buildBgComponentsHTML(components){
      try{
        const C = Array.isArray(components) ? components : [];
        if (!C.length) return '';
        const html = C.filter(c => c && c.visible !== false).map(c => {
          const id = esc(c.id || (Utils.genId ? Utils.genId() : ('it_' + Math.random().toString(36).slice(2,9))));
          const src = esc(c.src || '');
          const x = isFinite(c.x) ? Math.max(0, Math.min(100, Number(c.x))) : 50;
          const y = isFinite(c.y) ? Math.max(0, Math.min(100, Number(c.y))) : 50;
          const w = isFinite(c.w) ? Math.max(2, Math.min(100, Number(c.w))) : 20;
          const op = isFinite(c.opacity) ? Math.max(0, Math.min(1, Number(c.opacity))) : 1;
          return `<img class="bg-comp" data-id="${id}" src="${src}" alt="" style="left:${x}%;top:${y}%;width:${w}%;opacity:${op};">`;
        }).join('');
        return `<div class="bg-components-layer">${html}</div>`;
      }catch(_e){ return ''; }
    }

    function renderFxLayers(wrapperEl, customization){
      customization = customization || State.customization || {};
      try {
        if (!wrapperEl) return;
        wrapperEl.querySelectorAll('.fx-layer').forEach(n=>n.remove());
        const rect = wrapperEl.getBoundingClientRect();
        const W = rect.width || 600;
        const H = rect.height || 200;

        const rand = (min, max) => Math.random() * (max - min) + min;
        const randInt = (min, max) => Math.floor(rand(min, max + 1));
        const px = v => v + 'px';
        const pct = v => v + '%';

        if (customization.starEnabled) {
          const layer = global.document.createElement('div');
          layer.className = 'fx-layer fx-stars';
          layer.style.setProperty('--star-color', customization.starColor || '#ffffff');
          layer.style.setProperty('--star-speed', (customization.starFrequency || 2) + 's');
          const count = clamp(parseInt(customization.starDensity||0,10)||0, 0, 1000);
          for (let i=0; i<count; i++){
            const e = global.document.createElement('span');
            e.className = 'fx-star';
            const size = rand(1, 2.5);
            const x = rand(0, 100);
            const y = rand(0, 100);
            e.style.width = px(size);
            e.style.height = px(size);
            e.style.left = pct(x);
            e.style.top = pct(y);
            e.style.animationDelay = rand(0, customization.starFrequency||2) + 's';
            layer.appendChild(e);
          }
          wrapperEl.appendChild(layer);
        }

        if (customization.sparkleEnabled) {
          const layer = global.document.createElement('div');
          layer.className = 'fx-layer fx-sparkles';
          layer.style.setProperty('--sparkle-color', customization.sparkleColor || '#ffd966');
          const speed = customization.sparkleFrequency || 2;
          const dir = customization.sparkleDirection === 'up' ? 'up' : 'down';
          const count = clamp(parseInt(customization.sparkleDensity||0,10)||0, 0, 1000);
          for (let i=0; i<count; i++){
            const e = global.document.createElement('span');
            e.className = 'fx-sparkle' + (customization.sparkleGlow ? ' glow' : '');
            const size = rand(2, 3.5);
            const x = rand(0, 100);
            const delay = rand(0, speed);
            e.style.width = px(size);
            e.style.height = px(size);
            e.style.left = pct(x);
            e.style.top = dir === 'down' ? '-5%' : '105%';
            e.style.animationDuration = speed + 's';
            e.style.animationName = dir === 'down' ? 'sparkleDown' : 'sparkleUp';
            e.style.animationDelay = delay + 's';
            e.style.animationIterationCount = 'infinite';
            e.style.animationTimingFunction = 'linear';
            layer.appendChild(e);
          }
          wrapperEl.appendChild(layer);
        }

        if (customization.petalEnabled) {
          const layer = global.document.createElement('div');
          layer.className = 'fx-layer fx-petals';
          const speed = customization.petalFrequency || 5;
          const count = clamp(parseInt(customization.petalDensity||0,10)||0, 0, 1000);
          for (let i=0; i<count; i++){
            const e = global.document.createElement('span');
            e.className = 'fx-petal';
            const x = rand(0, 100);
            const delay = rand(0, speed);
            const rot = rand(-30, 30);
            e.style.left = pct(x);
            e.style.top = '-10%';
            e.style.animationDuration = speed + 's';
            e.style.animationDelay = delay + 's';
            e.style.transform = 'rotate(' + rot + 'deg)';
            if (customization.petalIconMode === 'url' && customization.petalIconUrl){
              const img = global.document.createElement('img');
              img.src = customization.petalIconUrl;
              img.alt = '';
              e.appendChild(img);
            } else {
              const svg = Utils.getBuiltinIconSVG ? Utils.getBuiltinIconSVG(customization.petalIconBuiltin || 'leaf', 18, customization.secondaryColor || '#ffffff') : '';
              e.innerHTML = svg;
            }
            layer.appendChild(e);
          }
          wrapperEl.appendChild(layer);
        }
      } catch (err) {
        try { console.warn('[fx] renderFxLayers error', err); } catch(_e){}
      }
    }

    function applyAnimation(wrapper, customization, enterAnim, loopAnim, animSpeed, animIntensity){
      customization = customization || State.customization || {};
      try {
        if (!wrapper) return;
        wrapper.style.setProperty('--anim-speed', `${(isFinite(animSpeed) ? animSpeed : (State.animSpeed || 1))}s`);
        wrapper.style.setProperty('--anim-intensity', `${(isFinite(animIntensity) ? animIntensity : (State.animIntensity || 0.7))}`);
        const a = (customization.glowColorA && customization.glowColorA.trim()) ? customization.glowColorA : (customization.primaryColor || '#85a6f8');
        const b = (customization.glowColorB && customization.glowColorB.trim()) ? customization.glowColorB : (customization.secondaryColor || '#95b3e8');
        const gs = (typeof customization.glowSpeed === 'number' ? customization.glowSpeed : 1.0);
        wrapper.style.setProperty('--glow-color-a', a);
        wrapper.style.setProperty('--glow-color-b', b);
        wrapper.style.setProperty('--glow-speed', `${gs}s`);

        wrapper.classList.remove('anim-none','anim-fade-in','anim-slide-up','anim-pulse','anim-neon-glow','anim-shimmer','anim-tilt-3d','anim-breathe','anim-gloss');
        const enterMap = { none:'', fade:'anim-fade-in', slide:'anim-slide-up' };
        const loopMap  = { none:'', pulse:'anim-pulse', neon:'anim-neon-glow', shimmer:'anim-shimmer', tilt3d:'anim-tilt-3d', breathe:'anim-breathe', gloss:'anim-gloss' };
        const enterCls = enterMap[(enterAnim || State.currentEnterAnimation || 'none')] || '';
        const loopCls  = loopMap[(loopAnim || State.currentLoopAnimation || 'none')] || '';
        if (enterCls) wrapper.classList.add(enterCls);
        if (loopCls)  wrapper.classList.add(loopCls);
      } catch(_e){}
    }

    function renderPreview(){
      console.log('[DEBUG renderPreview] Called');
      console.trace('[DEBUG renderPreview] call stack');
      const container = ensureContainer();
      if (!container) return;

      // unified VM from Ny.State to avoid duplicate defaults/derived computations
      const vm = (State && typeof State.getViewModel === 'function') ? State.getViewModel() : null;
      const theme = vm ? vm.theme : (State.currentTheme || 'theme-mystic-noir');
      const title = vm ? vm.title : (State.currentTitle || '角色状态');
      const items = State.items || [];
      const customization = State.customization || {};

      const headerHTML = getHeaderHTML2(theme, title, customization);
      try { console.log('[dbg] renderPreview headerHTML', { empty: headerHTML === '', titleEnabled: customization ? customization.titleEnabled : undefined }); } catch(_eLog){}
      const itemsHTML = buildItemsHTML2(items, theme, customization);

      let bodyStyle = '';

      // background layers/components come from VM when in layers mode
      const bgMode = vm ? (vm.background && vm.background.mode) : (customization.bgMode || 'theme');
      const bgLayersHTML = (bgMode === 'layers') ? buildBgLayersHTML((vm && vm.background && vm.background.layers) || customization.bgLayers, customization) : '';
      const bgCompsHTML = (bgMode === 'layers') ? buildBgComponentsHTML((vm && vm.background && vm.background.components) || customization.bgComponents) : '';

      const wrapperClass = vm ? vm.wrapper.className : (`status-preview-wrapper ${theme} percent-style-${customization.percentDisplay || 'center'}`);
      const wrapperStyle = vm ? vm.wrapper.styleInline : '';

      const html = `
        <div class="${wrapperClass}" style="${wrapperStyle}">
          ${bgLayersHTML}
          ${bgCompsHTML}
          ${headerHTML}
          <div class="st-body" style="${bodyStyle}">
            ${itemsHTML}
          </div>
        </div>
      `;
      container.innerHTML = html;
      const wrapper = container.querySelector('.status-preview-wrapper');
      
      // 一次性绑定：区域折叠/展开（更新 Ny.State.items 中的 collapsed 并触发重渲染）
      if (!global.__nyRegionToggleBound) {
        global.__nyRegionToggleBound = true;
        document.addEventListener('click', function(e){
          try {
            var hdr = e.target && e.target.closest ? e.target.closest('.st-region-header') : null;
            if (!hdr) return;
            var root = hdr.closest ? hdr.closest('.status-preview-wrapper') : null;
            if (!root) return;
            var headers = Array.prototype.slice.call(root.querySelectorAll('.st-region-header'));
            var idx = headers.indexOf(hdr);
            if (idx < 0) return;
            // 找到第 idx 个区域项在 Ny.State.items 中的位置
            var itemsArr = Array.isArray(State.items) ? (State.snapshot ? State.snapshot() : JSON.parse(JSON.stringify(State.items))) : [];
            var count = 0, pos = -1;
            for (var k = 0; k < itemsArr.length; k++) {
              var it = itemsArr[k];
              if (it && it.type === 'region') {
                if (count === idx) { pos = k; break; }
                count++;
              }
            }
            if (pos < 0) return;
  
            // 点击区域限制：根据 rtToggleMode 判断是否允许本次点击触发折叠
            var mode = String(itemsArr[pos] && itemsArr[pos].rtToggleMode || 'header');
            if (mode === 'title' && !(e.target && e.target.closest && e.target.closest('.st-region-title'))) return;
            if (mode === 'icon' && !(e.target && e.target.closest && e.target.closest('.st-region-toggle'))) return;
  
            // 匹配当前区域 DOM
            var regionEl = hdr.closest ? hdr.closest('.st-region') : null;
            if (!regionEl) return;
            var bodyEl = regionEl.querySelector('.st-region-body');
            var goingToCollapse = !itemsArr[pos].collapsed; // 当前为展开 -> 折叠
  
            // 解析动画配置（主体）
            var enterCombo = String(itemsArr[pos].rtRegionEnterCombo || 'slide-down+fade');
            var exitCombo  = String(itemsArr[pos].rtRegionExitCombo  || 'slide-up+fade');
            var dur = (typeof itemsArr[pos].rtRegionAnimDuration === 'number') ? itemsArr[pos].rtRegionAnimDuration : 0.6;
            var ease = String(itemsArr[pos].rtRegionAnimEasing || 'cubic-bezier(.22,.61,.36,1)');
            var intens = isFinite(itemsArr[pos].rtRegionAnimIntensity) ? Number(itemsArr[pos].rtRegionAnimIntensity) : 0.5;
  
            function classesForCombo(combo, phase){
              // phase: 'enter' | 'exit'
              var out = ['region-body-anim'];
              var c = String(combo || '').toLowerCase();
              if (c.indexOf('fade') >= 0) out.push(phase === 'enter' ? 'body-enter-fade' : 'body-exit-fade');
              if (c.indexOf('slide-down') >= 0) out.push(phase === 'enter' ? 'body-enter-slide-down' : 'body-exit-slide-down');
              if (c.indexOf('slide-up') >= 0) out.push(phase === 'enter' ? 'body-enter-slide-up' : 'body-exit-slide-up');
              if (c.indexOf('zoom-in') >= 0) out.push(phase === 'enter' ? 'body-enter-zoom-in' : 'body-exit-zoom-in');
              if (c.indexOf('zoom-out') >= 0) out.push(phase === 'enter' ? 'body-enter-zoom-out' : 'body-exit-zoom-out');
              // 单一选项（none/fade/...）
              if (out.length === 1) {
                if (c === 'none') { /* 无类 */ }
                else if (c === 'fade') out.push(phase === 'enter' ? 'body-enter-fade' : 'body-exit-fade');
                else if (c === 'slide-down') out.push(phase === 'enter' ? 'body-enter-slide-down' : 'body-exit-slide-down');
                else if (c === 'slide-up') out.push(phase === 'enter' ? 'body-enter-slide-up' : 'body-exit-slide-up');
                else if (c === 'zoom-in') out.push(phase === 'enter' ? 'body-enter-zoom-in' : 'body-exit-zoom-in');
                else if (c === 'zoom-out') out.push(phase === 'enter' ? 'body-enter-zoom-out' : 'body-exit-zoom-out');
              }
              return out;
            }
  
            function applyVars(el){
              try{
                el.style.setProperty('--rb-dur', String(dur) + 's');
                el.style.setProperty('--rb-ease', ease);
                el.style.setProperty('--rb-int', String(intens));
              }catch(_e){}
            }
            function cleanup(el, cls){
              try{ cls.forEach(function(c){ el.classList.remove(c); }); }catch(_e){}
            }
  
            if (goingToCollapse && bodyEl) {
              // 先播放退出动画，结束后再折叠并重渲染

              // 头部切换动画（collapse）：并行触发，不影响主体动画
              try {
                var styleKindHeader = String((itemsArr[pos] && itemsArr[pos].rtExpandAnimStyle) || 'flip3d');
                var expDur = (typeof itemsArr[pos].rtExpandAnimSpeed === 'number') ? itemsArr[pos].rtExpandAnimSpeed : 0.8;
                var expInt = (isFinite(itemsArr[pos].rtExpandAnimIntensity) ? Number(itemsArr[pos].rtExpandAnimIntensity) : 0.6);
                // 写入 CSS 变量
                hdr.style.setProperty('--exp-dur', String(expDur) + 's');
                hdr.style.setProperty('--exp-int', String(expInt));
                // 添加类并记录诊断信息
                var collapseHdrCls = 'region-collapse-' + styleKindHeader;
                hdr.classList.add(collapseHdrCls);
                try {
                  var cs = global.getComputedStyle(hdr);
                  console.log('[REGION-ANIM collapse] add class', {
                    idx: idx,
                    pos: pos,
                    styleKindHeader: styleKindHeader,
                    expDur: expDur,
                    expInt: expInt,
                    classAdded: collapseHdrCls,
                    animationName: cs && cs.animationName,
                    transition: cs ? (cs.transitionProperty + ' / ' + cs.transitionDuration) : null
                  });
                } catch (_elogC) {}
                // 一次性清理类
                var _hdrOnce = function(){
                  try { hdr.removeEventListener('animationend', _hdrOnce); } catch(_r){}
                  try { hdr.classList.remove(collapseHdrCls); } catch(_e2){}
                  try {
                    var cs2 = global.getComputedStyle(hdr);
                    console.log('[REGION-ANIM collapse] animationend cleanup', {
                      classRemoved: collapseHdrCls,
                      animationNameAfter: cs2 && cs2.animationName
                    });
                  } catch(_elogC2){}
                };
                try { hdr.addEventListener('animationend', _hdrOnce, { once: true }); } catch(_e){ _hdrOnce(); }
              } catch(_eHdr){
                try { console.warn('[REGION-ANIM collapse] error', _eHdr); } catch(_eLogErr){}
              }

              var exitCls = classesForCombo(exitCombo, 'exit');
              applyVars(bodyEl);
              exitCls.forEach(function(c){ bodyEl.classList.add(c); });
              var once = function(){
                try { bodyEl.removeEventListener('animationend', once); } catch(_r){}
                cleanup(bodyEl, exitCls);
                if (typeof State.setItems === 'function') {
                  itemsArr[pos].collapsed = true;
                  State.setItems(itemsArr);
                }
              };
              try { bodyEl.addEventListener('animationend', once, { once: true }); } catch(_e){ once(); }
            } else {
              // 展开：先更新状态重渲染，再对新 body 应用进入动画
              if (typeof State.setItems === 'function') {
                itemsArr[pos].collapsed = false;
                State.setItems(itemsArr);
              }
              try {
                global.requestAnimationFrame(function(){
                  try{
                    var newRoot = document.querySelector('.status-preview-wrapper');
                    if (!newRoot) return;
                    var newHeaders = Array.prototype.slice.call(newRoot.querySelectorAll('.st-region-header'));
                    var newHdr = newHeaders[idx];
                    if (!newHdr) return;
                    var newRegion = newHdr.closest('.st-region');
                    var newBody = newRegion ? newRegion.querySelector('.st-region-body') : null;
                    if (!newBody) return;

                    // 头部切换动画（expand）：并行触发，不影响主体进入动画
                    try {
                      var styleKindHeader = String((itemsArr[pos] && itemsArr[pos].rtExpandAnimStyle) || 'flip3d');
                      var expDur = (typeof itemsArr[pos].rtExpandAnimSpeed === 'number') ? itemsArr[pos].rtExpandAnimSpeed : 0.8;
                      var expInt = (isFinite(itemsArr[pos].rtExpandAnimIntensity) ? Number(itemsArr[pos].rtExpandAnimIntensity) : 0.6);
                      // 写入变量
                      try { newHdr.style.setProperty('--exp-dur', String(expDur) + 's'); } catch(_eS){}
                      try { newHdr.style.setProperty('--exp-int', String(expInt)); } catch(_eI){}
                      // 添加类并记录诊断信息
                      var expandHdrCls = 'region-expand-' + styleKindHeader;
                      try { newHdr.classList.add(expandHdrCls); } catch(_eC){}
                      try {
                        var csN = global.getComputedStyle(newHdr);
                        console.log('[REGION-ANIM expand] add class', {
                          idx: idx,
                          pos: pos,
                          styleKindHeader: styleKindHeader,
                          expDur: expDur,
                          expInt: expInt,
                          classAdded: expandHdrCls,
                          animationName: csN && csN.animationName,
                          transition: csN ? (csN.transitionProperty + ' / ' + csN.transitionDuration) : null
                        });
                      } catch(_elogE){}
                      // 一次性清理类
                      var _hdrOnce2 = function(){
                        try { newHdr.removeEventListener('animationend', _hdrOnce2); } catch(_r){}
                        try { newHdr.classList.remove(expandHdrCls); } catch(_eR){}
                        try {
                          var csN2 = global.getComputedStyle(newHdr);
                          console.log('[REGION-ANIM expand] animationend cleanup', {
                            classRemoved: expandHdrCls,
                            animationNameAfter: csN2 && csN2.animationName
                          });
                        } catch(_elogE2){}
                      };
                      try { newHdr.addEventListener('animationend', _hdrOnce2, { once: true }); } catch(_e){ _hdrOnce2(); }
                    } catch(_eHdr){
                      try { console.warn('[REGION-ANIM expand] error', _eHdr); } catch(_eLogErr){}
                    }

                    // 主体进入动画
                    var enterCls = classesForCombo(enterCombo, 'enter');
                    applyVars(newBody);
                    enterCls.forEach(function(c){ newBody.classList.add(c); });
                    var once2 = function(){
                      try { newBody.removeEventListener('animationend', once2); } catch(_r){}
                      cleanup(newBody, enterCls);
                    };
                    try { newBody.addEventListener('animationend', once2, { once: true }); } catch(_e){ once2(); }
                  }catch(_e1){}
                });
              } catch(_eRAF){}
            }
          } catch(_e){}
        }, false);
      }
      
      try {
        const itemNodes = wrapper ? wrapper.querySelectorAll('.st-body .st-item') : [];
        let __idx = 0;
        (Array.isArray(items) ? items : []).forEach(it => {
          if (it.type === 'divider') return;
          const el = itemNodes[__idx++];
          if (!el) return;
          const valEl = el.querySelector('.st-value');
          if (isFinite(it.itemOffsetPct)) el.style.setProperty('--item-offset-pct', clamp(parseFloat(it.itemOffsetPct) || 0, -40, 40));
          if (isFinite(it.itemOffsetRightPct)) el.style.setProperty('--item-offset-right-pct', clamp(parseFloat(it.itemOffsetRightPct) || 0, -40, 40));
          if (valEl) {
            if (isFinite(it.vbWidthPct)) valEl.style.setProperty('--vb-width-pct', clamp(parseFloat(it.vbWidthPct) || 100, 40, 100));
            if (isFinite(it.vbOffsetPct)) {
              const __v = clamp(parseFloat(it.vbOffsetPct) || 0, -40, 40);
              valEl.style.setProperty('--vb-offset-pct', __v);
              valEl.style.setProperty('--vb-offset-pct-pos', Math.max(0, __v));
              valEl.style.setProperty('--vb-offset-pct-neg', Math.min(0, __v));
            }
          }
          (function applyCardBgShadow(){
            try {
              const pickStr = (a, b) => {
                const s = (a == null ? '' : String(a)).trim();
                return s ? s : (b == null ? '' : String(b));
              };
              const pickNum = (a, b, def) => {
                if (isFinite(a)) return Number(a);
                if (isFinite(b)) return Number(b);
                return def;
              };

              let mode = customization.itemCardBgMode || 'theme';
              let color = customization.itemCardBgColor || '#111215';
              let gStart = customization.itemCardGradStart || customization.primaryColor;
              let gEnd = customization.itemCardGradEnd || customization.secondaryColor;
              let gAngle = Number(customization.itemCardGradAngle ?? 135) || 135;
              let imgUrl = customization.itemCardBgImageUrl || '';
              let url = customization.itemCardBgUrl || '';

              if (customization.itemCardPerItemEnabled) {
                // Per-item overrides: mode and related fields (align with global selections)
                if (it.cardBgMode && String(it.cardBgMode) !== 'inherit') {
                  mode = String(it.cardBgMode);
                }
                if (mode === 'color') {
                  color = pickStr(it.cardBgColor, color);
                } else if (mode === 'gradient') {
                  gStart = pickStr(it.cardGradStart, gStart);
                  gEnd = pickStr(it.cardGradEnd, gEnd);
                  gAngle = pickNum(it.cardGradAngle, gAngle, 135) || 135;
                } else if (mode === 'image') {
                  imgUrl = pickStr(it.cardBgImageUrl, imgUrl);
                } else if (mode === 'url') {
                  url = pickStr((it.cardBgUrl != null ? it.cardBgUrl : it.cardUrl), url);
                }
                // theme/none: no additional fields required
              }

              el.style.background = '';
              el.style.backgroundImage = '';
              el.style.backgroundSize = '';
              el.style.backgroundPosition = '';
              el.style.backgroundRepeat = '';
              if (mode === 'none') {
                el.style.background = 'transparent';
              } else if (mode === 'color') {
                el.style.background = color;
              } else if (mode === 'gradient') {
                el.style.background = `linear-gradient(${gAngle}deg, ${gStart}, ${gEnd})`;
              } else if (mode === 'image') {
                if (imgUrl && imgUrl.trim()) {
                  el.style.backgroundImage = `url('${esc(imgUrl)}')`;
                  el.style.backgroundSize = 'cover';
                  el.style.backgroundPosition = 'center';
                  el.style.backgroundRepeat = 'no-repeat';
                }
              } else if (mode === 'url') {
                if (url && url.trim()) {
                  el.style.backgroundImage = `url('${esc(url)}')`;
                  el.style.backgroundSize = 'cover';
                  el.style.backgroundPosition = 'center';
                  el.style.backgroundRepeat = 'no-repeat';
                }
              }
              let shadowOn = !!customization.itemCardShadowEnabled;
              let shadowStrength = Number(customization.itemCardShadowStrength || 0.30);
              if (customization.itemCardPerItemEnabled) {
                if (it.cardShadowEnable != null) shadowOn = !!it.cardShadowEnable;
                if (isFinite(it.cardShadowStrength)) shadowStrength = Number(it.cardShadowStrength);
              }
              if (shadowOn) {
                const s = Math.max(0, Math.min(1, shadowStrength));
                const y = (4 + 8 * s).toFixed(1);
                const blur = (10 + 18 * s).toFixed(1);
                el.style.boxShadow = `0 ${y}px ${blur}px rgba(0,0,0,${0.2 + 0.3*s})`;
              } else {
                el.style.boxShadow = '';
              }
            } catch (_e) {}
          })();
        });
        try {
          const snap = (State.snapshot ? State.snapshot() : []);
          const coh = Utils.computeCoherence ? Utils.computeCoherence({
            theme,
            primaryColor: customization.primaryColor,
            secondaryColor: customization.secondaryColor,
            letterSpacing: customization.letterSpacing,
            lineHeight: customization.lineHeight,
            animationType: State.currentAnimation || 'none'
          }) : 0.5;
          console.log('[Ny.Render] per-item overrides applied', items.map(it => ({ id: it.id, vbWidthPct: it.vbWidthPct, vbOffsetPct: it.vbOffsetPct, itemOffsetPct: it.itemOffsetPct, itemOffsetRightPct: it.itemOffsetRightPct, cardUrl: it.cardUrl, cardShadowEnable: it.cardShadowEnable, cardShadowStrength: it.cardShadowStrength })));
          console.log('[Ny.Render] preview', {
            theme,
            layout: customization.layout,
            fontFamily: customization.fontFamily,
            barStyle: customization.barStyle,
            barAnimation: customization.barAnimation,
            animation: State.currentAnimation,
            animSpeed: State.animSpeed,
            animIntensity: State.animIntensity,
            coherence: coh,
            items: snap
          });
        } catch(_e){}
      } catch (e) {
        try {
          console.warn('[Ny.Render] preview error', e);
          if (container) container.innerHTML = '<div style="color:#ff8080;padding:12px;border:1px solid #ff8080;border-radius:6px;background:rgba(255,0,0,.06);">预览失败，已加载降级视图。打开控制台查看详情。</div>';
        } catch(_e){}
      }

      if (customization.bgMode === 'layers') {
        // 拖拽提示由 UI/Background 模块负责；此处仅保持渲染一致性
      }

      if (wrapper) {
        wrapper.style.height = '';
        wrapper.style.overflow = '';
      }
      renderFxLayers(wrapper, customization);
      applyAnimation(wrapper, customization, State.currentEnterAnimation, State.currentLoopAnimation, State.animSpeed, State.animIntensity);

      try {
        const nodes = wrapper?.querySelectorAll('.st-longtext[data-effect="typewriter"]');
        nodes?.forEach(el => {
          // 获取所有段落元素
          const paragraphs = el.querySelectorAll('p');
          if (!paragraphs || paragraphs.length === 0) {
            // 回退增强：动态创建段落并逐段打字，保持分段结构
            const raw = el.textContent || '';
            // 清空容器，准备插入段落
            el.textContent = '';
            const spd = Math.max(5, Math.min(200, parseInt(el.getAttribute('data-tw-speed') || '18', 10) || 18));
            const delay = Math.max(0, parseInt(el.getAttribute('data-tw-delay') || '0', 10) || 0);
            const caretOn = (el.getAttribute('data-tw-caret') !== '0');
            const parts = raw.split('\n');
            const created = parts.map(function(para){
              const p = global.document.createElement('p');
              // 保留基础段落样式，缩进在无状态时默认为0
              p.setAttribute('style', 'margin:0; padding:0;');
              el.appendChild(p);
              return { node: p, text: para };
            });
            let cumulativeDelay = delay;
            created.forEach(function(entry){
              var p = entry.node;
              var fullText = entry.text || '';
              var charIndex = 0;
              // 逐字符渲染当前段落
              var typeParagraph = function() {
                if (charIndex >= fullText.length) {
                  p.textContent = fullText;
                  return;
                }
                charIndex++;
                if (caretOn && charIndex < fullText.length) {
                  p.textContent = fullText.slice(0, charIndex) + '▌';
                } else {
                  p.textContent = fullText.slice(0, charIndex);
                }
                global.setTimeout(typeParagraph, spd);
              };
              global.setTimeout(typeParagraph, cumulativeDelay);
              cumulativeDelay += fullText.length * spd;
            });
            return;
          }
          
          // 新逻辑：逐段落打字，保持段落结构和首字缩进
          const spd = Math.max(5, Math.min(200, parseInt(el.getAttribute('data-tw-speed') || '18', 10) || 18));
          const baseDelay = Math.max(0, parseInt(el.getAttribute('data-tw-delay') || '0', 10) || 0);
          const caretOn = (el.getAttribute('data-tw-caret') !== '0');
          
          let cumulativeDelay = baseDelay;
          
          paragraphs.forEach((p, pIdx) => {
            const fullText = p.textContent || '';
            const originalStyle = p.getAttribute('style') || ''; // 保存原始样式
            p.textContent = '\u00A0'; // 清空段落内容但保留标签
            
            let charIndex = 0;
            
            const typeParagraph = function() {
              if (charIndex >= fullText.length) {
                p.textContent = fullText;
                return;
              }
              
              charIndex++;
              if (caretOn && charIndex < fullText.length) {
                p.textContent = fullText.slice(0, charIndex) + '▌';
              } else {
                p.textContent = fullText.slice(0, charIndex);
              }
              
              global.setTimeout(typeParagraph, spd);
            };
            
            // 启动当前段落的打字效果，使用累积延迟确保顺序
            global.setTimeout(typeParagraph, cumulativeDelay);
            
            // 计算下一段落的起始延迟：当前段落字符数 × 打字速度
            cumulativeDelay += fullText.length * spd;
          });
        });
      } catch (_e) {}
    }

    // 区域分组与折叠预览（保持样式一致；仅包裹子项）
    function buildItemsHTML2(list, theme, customization){
      customization = customization || State.customization || {};
      const sc = customization.secondaryColor;
      const s2Label = customization.section2LabelColor && customization.section2LabelColor.trim().length > 0 ? customization.section2LabelColor : '';
      const labelFontFamily = customization.globalLabelFontFamily || customization.fontFamily;
      const labelWeight = customization.globalLabelWeight || 500;
      const labelFontSize = customization.globalLabelFontSize || 0;
      const styleJoin = parts => parts.filter(Boolean).join('; ');

      const L = Array.isArray(list) ? list : [];
      const htmlParts = [];

      for (let i = 0; i < L.length; i++) {
        const it = L[i];
        if (!it) continue;
        // 非顶级：若此项声明了 parentRegionId，交由其所属区域渲染，这里跳过
        if (it.parentRegionId) continue;

        if (it.type === 'region') {
          const regionLabel = esc(it.label || '区域');
          const isCollapsed = !!it.collapsed;

          // 收集区域内的子项：仅选择 parentRegionId 指向本区域的项目（顺序按列表原始顺序）
          const children = L.filter(x => x && x.parentRegionId === it.id);

          // 复用原 buildItemsHTML 渲染区域子项（样式/布局保持一致）
          const inner = buildItemsHTML(children, theme, customization);

          // 区域标题样式：优先使用每个区域的独立设置（rt*），否则回退到全局“标签”样式
          const titleColor = s2Label || sc;
          const rtAlign   = String(it.rtAlign || 'left');
          const rtSize    = isFinite(it.rtFontSize) ? Number(it.rtFontSize) : (labelFontSize || 0);
          const rtWeight  = isFinite(it.rtWeight) ? Number(it.rtWeight) : labelWeight;
          const rtItalic  = it.rtItalic ? 'font-style:italic' : '';
          const rtUpper   = it.rtUppercase ? 'text-transform:uppercase' : '';
          const ulStyle   = String(it.rtUnderlineStyle || 'none');
          const ulColor   = (it.rtUnderlineColor && String(it.rtUnderlineColor).trim()) ? String(it.rtUnderlineColor).trim() : titleColor;
          const ulThick   = isFinite(it.rtUnderlineThickness) ? Math.max(1, Number(it.rtUnderlineThickness)) : 2;
          const ulOffset  = isFinite(it.rtUnderlineOffset) ? Math.max(0, Number(it.rtUnderlineOffset)) : 4;
          const colorMode = String(it.rtColorMode || 'theme');
          const titleStyleParts = [];

          const hdrStyleParts = [
            labelFontFamily ? `font-family:${labelFontFamily}` : '',
            `font-weight:${rtWeight}`,
            rtSize ? `font-size:${rtSize}px` : '',
            rtItalic,
            rtUpper,
            `text-align:${rtAlign}`
          ];
    
          // 标题上/下间距（折叠/展开共用）
          (function(){
            try{
              const mTop = isFinite(it.rtHeaderMarginTopPx) ? Math.max(0, Number(it.rtHeaderMarginTopPx)) : 6;
              const mBottom = isFinite(it.rtHeaderMarginBottomPx) ? Math.max(0, Number(it.rtHeaderMarginBottomPx)) : 6;
              hdrStyleParts.push(`margin-top:${mTop}px`);
              hdrStyleParts.push(`margin-bottom:${mBottom}px`);
            } catch(_e){}
          })();
    
          if (colorMode === 'solid') {
            const solid = (it.rtColorSolid && String(it.rtColorSolid).trim()) ? String(it.rtColorSolid).trim() : titleColor;
            // 标题使用纯色；容器也设置为同色，确保图标等可见
            hdrStyleParts.push(`color:${solid}`);
            titleStyleParts.push(`color:${solid}`);
          } else if (colorMode === 'gradient') {
            const a = (it.rtGradStart && String(it.rtGradStart).trim()) ? String(it.rtGradStart).trim() : (customization.primaryColor || titleColor);
            const b = (it.rtGradEnd && String(it.rtGradEnd).trim()) ? String(it.rtGradEnd).trim() : (customization.secondaryColor || titleColor);
            const ang = isFinite(it.rtGradAngle) ? Number(it.rtGradAngle) : 0;
            // 渐变仅应用到标题文本，容器保留可见颜色以避免折叠态不可见
            hdrStyleParts.push(`color:${titleColor}`);
            titleStyleParts.push(
              `background:linear-gradient(${ang}deg, ${a}, ${b})`,
              `-webkit-background-clip:text`,
              `background-clip:text`,
              `color:transparent`
            );
          } else {
            // 主题色：容器设为标题色，标题不额外覆写以继承
            hdrStyleParts.push(`color:${titleColor}`);
          }

          if (ulStyle !== 'none') {
            titleStyleParts.push(
              'text-decoration-line:underline',
              `text-decoration-style:${ulStyle}`,
              `text-decoration-color:${ulColor}`,
              `text-decoration-thickness:${ulThick}px`,
              `text-underline-offset:${ulOffset}px`
            );
          }

          // 折叠时的头部背景与折叠图标/点击模式
          const cbgMode = String(it.rtCollapsedBgMode || 'none');
          if (isCollapsed) {
            // 背景模式：none 不设背景；glass 使用类；solid/gradient 使用内联
            if (cbgMode === 'solid') {
              const col = (it.rtCollapsedBgColor && String(it.rtCollapsedBgColor).trim()) ? String(it.rtCollapsedBgColor).trim() : (customization.primaryColor || '#111215');
              hdrStyleParts.push(`background:${col}`);
            } else if (cbgMode === 'gradient') {
              const a = (it.rtCollapsedGradStart && String(it.rtCollapsedGradStart).trim()) ? String(it.rtCollapsedGradStart).trim() : (customization.primaryColor || '#6a717c');
              const b = (it.rtCollapsedGradEnd && String(it.rtCollapsedGradEnd).trim()) ? String(it.rtCollapsedGradEnd).trim() : (customization.secondaryColor || '#97aec8');
              const ang = isFinite(it.rtCollapsedGradAngle) ? Number(it.rtCollapsedGradAngle) : 135;
              hdrStyleParts.push(`background:linear-gradient(${ang}deg, ${a}, ${b})`);
            } else if (cbgMode === 'glass') {
              /* 玻璃模式由 CSS 类呈现，避免内联背景覆盖；类在下方 headerCls 中添加 */
            }
            // 折叠态头部：圆角/边框/内边距/阴影/动画变量
            const __br = isFinite(it.rtCollapsedRadiusPx) ? Number(it.rtCollapsedRadiusPx) : 8;
            if (isFinite(__br) && __br > 0) hdrStyleParts.push(`border-radius:${__br}px`);
            const __bt = isFinite(it.rtCollapsedBorderThickness) ? Number(it.rtCollapsedBorderThickness) : 1;
            const __bc = (it.rtCollapsedBorderColor && String(it.rtCollapsedBorderColor).trim()) ? String(it.rtCollapsedBorderColor).trim() : ulColor;
            if (__bt > 0) hdrStyleParts.push(`border:${__bt}px solid ${__bc}`);
            const __py = isFinite(it.rtCollapsedPaddingY) ? Number(it.rtCollapsedPaddingY) : 6;
            if (isFinite(__py) && __py > 0) hdrStyleParts.push(`padding-block:${__py}px`);
            const __ss = isFinite(it.rtCollapsedShadowStrength) ? Math.max(0, Math.min(1, Number(it.rtCollapsedShadowStrength))) : 0.25;
            const __y = (2 + 6 * __ss).toFixed(1);
            const __blur = (6 + 12 * __ss).toFixed(1);
            const __alpha = (0.18 + 0.22 * __ss).toFixed(2);
            hdrStyleParts.push(`box-shadow: 0 ${__y}px ${__blur}px rgba(0,0,0,${__alpha})`);
            // header 局部动画变量
            const __hs = (typeof it.rtCollapsedAnimSpeed === 'number') ? it.rtCollapsedAnimSpeed : 1.4;
            const __hi = isFinite(it.rtCollapsedAnimIntensity) ? Number(it.rtCollapsedAnimIntensity) : 0.5;
            hdrStyleParts.push(`--anim-speed:${__hs}s`, `--anim-intensity:${__hi}`);
          }
          const iconStyle = String(it.rtToggleIconStyle || 'triangle');
          let iconExp, iconCol;
          if (iconStyle === 'plusminus') { iconExp = '−'; iconCol = '+'; }
          else if (iconStyle === 'arrow') { iconExp = '↓'; iconCol = '→'; }
          else if (iconStyle === 'custom') {
            iconExp = (it.rtToggleIconExp && String(it.rtToggleIconExp).trim()) ? String(it.rtToggleIconExp).trim() : '▾';
            iconCol = (it.rtToggleIconCol && String(it.rtToggleIconCol).trim()) ? String(it.rtToggleIconCol).trim() : '▶';
          } else { iconExp = '▾'; iconCol = '▶'; }
          const toggleIcon = isCollapsed ? iconCol : iconExp;
          const toggleMode = String(it.rtToggleMode || 'header');
 
          // 头部进入/循环动画类（仅折叠态生效）
          const headerCls = ['st-region-header'];
          if (isCollapsed) {
            // 玻璃模式类（配合 CSS 呈现模糊/光泽）
            if (cbgMode === 'glass') headerCls.push('hdr-mode-glass');
            // 头部进入动画（折叠态）：支持 none/fade/slide/pop/wipe/underline/ripple/glitch/flip3d
            const en = String(it.rtCollapsedEnterAnim || 'none');
            if (en === 'fade') headerCls.push('region-enter-fade');
            else if (en === 'slide') headerCls.push('region-enter-slide');
            else if (en === 'pop') headerCls.push('region-enter-pop');
            else if (en === 'wipe') headerCls.push('region-enter-wipe');
            else if (en === 'underline') headerCls.push('region-enter-underline');
            else if (en === 'ripple') headerCls.push('region-enter-ripple');
            else if (en === 'glitch') headerCls.push('region-enter-glitch');
            else if (en === 'flip3d') headerCls.push('region-enter-flip3d');
            // 头部循环动画（折叠态）
            const lp = String(it.rtCollapsedLoopAnim || 'none');
            if (lp === 'gloss') headerCls.push('region-loop-gloss');
            else if (lp === 'shimmer') headerCls.push('region-loop-shimmer');
            else if (lp === 'breathe') headerCls.push('region-loop-breathe');
            else if (lp === 'neon') headerCls.push('region-loop-neon');
          }
 
          const hdrStyle = styleJoin(hdrStyleParts);
          const titleStyle = styleJoin(titleStyleParts);
          const titleInline = titleStyle ? ` style="${titleStyle}"` : '';
          try { console.debug('[REGION TITLE STYLE]', { label: regionLabel, colorMode, titleStyle }); } catch(_e){}
 
          // 主体动画配置（写入变量，类在交互中动态添加）
          const __rbDur = (typeof it.rtRegionAnimDuration === 'number') ? it.rtRegionAnimDuration : 0.6;
          const __rbInt = isFinite(it.rtRegionAnimIntensity) ? Number(it.rtRegionAnimIntensity) : 0.5;
          const __rbEase = String(it.rtRegionAnimEasing || 'cubic-bezier(.22,.61,.36,1)');
          const bodyAnimStyle = `--rb-dur:${__rbDur}s; --rb-int:${__rbInt}; --rb-ease:${__rbEase}`;
          const dataEnter = String(it.rtRegionEnterCombo || 'slide-down+fade');
          const dataExit  = String(it.rtRegionExitCombo  || 'slide-up+fade');

          // 区域体 背景/圆角/阴影/内边距/循环特效
          const rbMode = String(it.rtRegionBgMode || 'none');
          const bodyCls = ['st-region-body'];
          // 循环特效（与头部通用类名，便于样式复用）
          (function(){
            const lp = String(it.rtRegionBodyLoopAnim || 'none');
            if (lp === 'gloss') bodyCls.push('region-loop-gloss');
            else if (lp === 'shimmer') bodyCls.push('region-loop-shimmer');
            else if (lp === 'breathe') bodyCls.push('region-loop-breathe');
            else if (lp === 'neon') bodyCls.push('region-loop-neon');
          })();

          const bodyStyleParts = [];
          if (isCollapsed) bodyStyleParts.push('display:none');
          // 动画变量
          bodyStyleParts.push(bodyAnimStyle);

          // 背景（仅当选择了模式时应用）
          (function(){
            try{
              if (rbMode === 'solid') {
                const col = (it.rtRegionBgColor && String(it.rtRegionBgColor).trim()) ? String(it.rtRegionBgColor).trim() : '#111215';
                bodyStyleParts.push(`background:${col}`);
              } else if (rbMode === 'gradient') {
                const a = (it.rtRegionBgGradStart && String(it.rtRegionBgGradStart).trim()) ? String(it.rtRegionBgGradStart).trim() : (customization.primaryColor || '#6a717c');
                const b = (it.rtRegionBgGradEnd && String(it.rtRegionBgGradEnd).trim()) ? String(it.rtRegionBgGradEnd).trim() : (customization.secondaryColor || '#97aec8');
                const ang = isFinite(it.rtRegionBgGradAngle) ? Number(it.rtRegionBgGradAngle) : 135;
                bodyStyleParts.push(`background:linear-gradient(${ang}deg, ${a}, ${b})`);
              } else if (rbMode === 'image') {
                const url = (it.rtRegionBgImageUrl && String(it.rtRegionBgImageUrl).trim()) ? esc(String(it.rtRegionBgImageUrl).trim()) : '';
                if (url) {
                  bodyStyleParts.push(`background-image:url('${url}')`);
                  bodyStyleParts.push(`background-size:cover`);
                  bodyStyleParts.push(`background-position:center`);
                  bodyStyleParts.push(`background-repeat:no-repeat`);
                }
              } else if (rbMode === 'url') {
                const url = ((it.rtRegionBgUrl != null ? String(it.rtRegionBgUrl) : '').trim());
                if (url) {
                  const u = esc(url);
                  bodyStyleParts.push(`background-image:url('${u}')`);
                  bodyStyleParts.push(`background-size:cover`);
                  bodyStyleParts.push(`background-position:center`);
                  bodyStyleParts.push(`background-repeat:no-repeat`);
                }
              } // rbMode === 'none' 不做处理，保持透明以便主题背景透出
            }catch(_eBg){}
          })();

          // 圆角
          (function(){
            const r = isFinite(it.rtRegionBodyRadiusPx) ? Number(it.rtRegionBodyRadiusPx) : 8;
            if (isFinite(r) && r > 0) bodyStyleParts.push(`border-radius:${r}px`);
          })();

          // 上下内边距
          (function(){
            const py = isFinite(it.rtRegionBodyPaddingY) ? Number(it.rtRegionBodyPaddingY) : 8;
            if (isFinite(py) && py > 0) bodyStyleParts.push(`padding-block:${py}px`);
          })();

          // 阴影
          (function(){
            const ss = isFinite(it.rtRegionBodyShadowStrength) ? Math.max(0, Math.min(1, Number(it.rtRegionBodyShadowStrength))) : 0;
            if (ss > 0) {
              const y = (2 + 8 * ss).toFixed(1);
              const blur = (8 + 16 * ss).toFixed(1);
              const alpha = (0.18 + 0.25 * ss).toFixed(2);
              bodyStyleParts.push(`box-shadow: 0 ${y}px ${blur}px rgba(0,0,0,${alpha})`);
            }
          })();

          const bodyStyle = styleJoin(bodyStyleParts);

          htmlParts.push(`
            <div class="st-region${isCollapsed ? ' collapsed' : ''}">
              <div class="${headerCls.join(' ')}" data-toggle-mode="${toggleMode}" data-cbg-mode="${cbgMode}" style="${hdrStyle}" title="折叠/展开">
                <span class="st-region-title"${titleInline}>${regionLabel}</span>
                <span class="st-region-toggle${(it.rtIconRotateEnabled !== false) ? ' rotatable' : ''}">${toggleIcon}</span>
              </div>
              <div class="${bodyCls.join(' ')}" data-enter="${dataEnter}" data-exit="${dataExit}" style="${bodyStyle}">
                ${inner}
              </div>
            </div>
          `);

          // 子项将在本区域内部渲染；主循环跳过带有 parentRegionId 的项目
          continue;
        }

        // 非区域：按原逻辑渲染单项
        htmlParts.push(buildItemsHTML([it], theme, customization));
      }

      return htmlParts.join('');
    }
    return {
      mount,
      renderPreview,
      applyAnimation,
      getHeaderHTML2,
      dividerHTML,
      buildItemsHTML,
      buildItemsHTML2,
      renderFxLayers
    };
  })();
})(typeof window !== 'undefined' ? window : globalThis);
// Reactive bridge: keep preview and export consistent with state changes
(function(global){
  'use strict';
  try{
    var rafId = 0;
    var isInitialLoad = true; // 标记是否为初始加载
    
    function schedule(options){
      var opts = options || {};
      var skipExport = opts.skipExport || false;
      console.log('[DEBUG schedule] Called - scheduling render via RAF, skipExport:', skipExport);
      try { if (rafId) global.cancelAnimationFrame(rafId); } catch(_e){}
      try {
        rafId = global.requestAnimationFrame(function(){
          console.log('[DEBUG RAF callback] Executing scheduled render, skipExport:', skipExport);
          rafId = 0;
          try {
            if (global.Ny && global.Ny.Render && typeof global.Ny.Render.renderPreview === 'function') {
              global.Ny.Render.renderPreview();
            }
          } catch(_e){
            console.error('[DEBUG RAF callback] renderPreview error:', _e);
          }
          // 只在非初始加载且未明确跳过时才调用 refreshOutputs
          if (!skipExport) {
            try {
              if (global.Ny && global.Ny.Export && typeof global.Ny.Export.refreshOutputs === 'function') {
                console.log('[DEBUG RAF callback] Calling refreshOutputs');
                global.Ny.Export.refreshOutputs(false, { inlineGroup: true });
              }
            } catch(_e){
              console.error('[DEBUG RAF callback] refreshOutputs error:', _e);
            }
          } else {
            console.log('[DEBUG RAF callback] Skipping refreshOutputs (skipExport=true)');
          }
        });
      } catch(_e){
        // Fallback if RAF not available
        try {
          if (global.Ny && global.Ny.Render && typeof global.Ny.Render.renderPreview === 'function') {
            global.Ny.Render.renderPreview();
          }
          if (!skipExport && global.Ny && global.Ny.Export && typeof global.Ny.Export.refreshOutputs === 'function') {
            global.Ny.Export.refreshOutputs(false, { inlineGroup: true });
          }
        } catch(__e){}
      }
    }
    // Render/Export react to any state change from left-side controls
    global.addEventListener('ny:state-change', function(){ schedule(); }, false);
    // Initial render is handled by HTML inline code
    // Disabling this load event listener to avoid state reset and UI corruption
    /*
    global.addEventListener('load', function(){
      try {
        console.log('[DEBUG load event] Triggered - skipping state initialization, only rendering');
        
        // 不再调用 applyThemeDefaults，因为：
        // 1. HTML 内联代码已经完成了初始化和首次渲染
        // 2. 调用 applyThemeDefaults 会重置状态，导致 UI 显示错误
        // 3. 仅在用户切换主题时才应该调用 applyThemeDefaults

        // 等待字体就绪后再触发一次渲染，确保字体加载完成
        // 初始加载时跳过 refreshOutputs，避免不必要的导出操作和 CORS 错误
        var f = global.document && global.document.fonts;
        if (f && typeof f.ready === 'object' && typeof f.ready.then === 'function') {
          f.ready.then(function(){ 
            console.log('[DEBUG load event] Fonts ready, scheduling render');
            schedule({ skipExport: true }); 
            isInitialLoad = false;
          });
        } else {
          console.log('[DEBUG load event] Fonts API not available, scheduling render immediately');
          schedule({ skipExport: true });
          isInitialLoad = false;
        }
      } catch(_e){
        schedule({ skipExport: true });
        isInitialLoad = false;
      }
    }, false);
    */
  } catch(_e){}
})(typeof window !== 'undefined' ? window : globalThis);