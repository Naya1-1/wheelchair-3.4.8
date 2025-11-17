(function(global){
  'use strict';
  var Ny = global.Ny || (global.Ny = {});
  Ny.Sections = Ny.Sections || {};

  Ny.Sections.renderItems = function(){
    try {
      var sec = global.document.getElementById('section-2');
      if (!sec) return;

      function renderNow(){
        var P = (Ny.Sections && Ny.Sections.ItemsParts) || {};
        var req = ['colorsAndBar','cardBgShadow','longtextGlobal','valueBoxOffsets','fontsStyle','editor'];
        var ready = req.every(function(fn){ return typeof P[fn] === 'function'; });
        if (!ready) { try { console.warn('[Ny.Sections] ItemsParts not ready'); } catch(_e) {} return; }

        var body = sec.querySelector('.section-body');
        if (!body) {
          body = global.document.createElement('div');
          body.className = 'section-body';
          sec.appendChild(body);
        }

        var html = ''
          + P.colorsAndBar()
          + P.cardBgShadow()
          + P.longtextGlobal()
          + P.valueBoxOffsets()
          + P.fontsStyle()
          + P.editor();

        body.innerHTML = html;

        // ============ 项目编辑（每项独立设置：长文字） ============
        (function setupItemsEditor(){
          try{
            var State = Ny.State || {};
            var Render = Ny.Render || {};
            var Exporter = Ny.Export || {};
            var Utils = Ny.Utils || {};

            // 绑定“允许每个项目独立设置背景与阴影”全局开关，与状态同步
            (function bindPerItemToggle(){
              try{
                var cb = body.querySelector('#item-bg-shadow-per-item-toggle');
                if (!cb) return;
                // 初始对齐状态
                try { cb.checked = !!(State.customization && State.customization.itemCardPerItemEnabled); } catch(_e0){}
                if (!cb.__nyBound) {
                  cb.__nyBound = true;
                  cb.addEventListener('change', function(){
                    try {
                      var on = !!cb.checked;
                      if (typeof State.patchCustomization === 'function') {
                        State.patchCustomization({ itemCardPerItemEnabled: on });
                      } else if (State && State.customization) {
                        State.customization.itemCardPerItemEnabled = on;
                      }
                      // 预览 + 输出刷新
                      try { if (Render && typeof Render.renderPreview === 'function') Render.renderPreview(); } catch(_eR){}
                      try { if (Exporter && typeof Exporter.refreshOutputs === 'function') Exporter.refreshOutputs(false, { inlineGroup: true }); } catch(_eEx){}
                      // 重新渲染“项目编辑”面板，以显示/隐藏每项独立设置块
                      try { renderItemsEditor(); } catch(_eRe){}
                    } catch(_e1){}
                  });
                }
              } catch(_outer){}
            })();

            function clamp(n, a, b){ n = Number(n); if (!isFinite(n)) n = 0; return Math.max(a, Math.min(b, n)); }
            function newId(){
              try { if (Utils.genId) return Utils.genId(); } catch(_e){}
              return 'it_' + Math.random().toString(36).slice(2, 9);
            }
            function getItems(){ try { return Array.isArray(State.items) ? State.items.slice() : []; } catch(_e){ return []; } }
            function setItems(next){
              try {
                if (typeof State.setItems === 'function') State.setItems(next);
                else State.items = next;
              } catch(_e){ State.items = next; }
              try { if (Render && typeof Render.renderPreview === 'function') Render.renderPreview(); } catch(_e){}
              try { if (Exporter && typeof Exporter.refreshOutputs === 'function') Exporter.refreshOutputs(false, { inlineGroup: true }); } catch(_e){}
            }
            function updateItemById(id, patch){
              var list = getItems();
              var next = list.map(function(it){ return (it && it.id === id) ? Object.assign({}, it, patch) : it; });
              try { console.log('[REGION-COLLAPSE-UI] updateItemById', { id: String(id), keys: Object.keys(patch || {}), patch: patch }); } catch(_e){}
              try {
                var after = (Array.isArray(next)?next:[]).find(function(x){ return x && x.id === id; });
                console.log('[REGION-COLLAPSE-UI] afterPatch', after);
              } catch(_e2){}
              setItems(next);
            }
            function removeItemById(id){
              var list = getItems();
              var next = list.filter(function(it){ return !it || it.id !== id; });
              setItems(next);
              renderItemsEditor(); // 重新渲染编辑器列表
            }

            function renderItemsEditor(){
              var cont = body.querySelector('#items-container');
              if (!cont) return;
              cont.innerHTML = '';

              var list = getItems();
              // 计算“项目编辑”中的编号（区域内子项目编号形如 X.n；全局添加的项目保持顶级序号）
              var __indexById = {};
              list.forEach(function(x, i){ if (x && x.id) __indexById[x.id] = i; });
              function __childrenOf(rid){
                return list.filter(function(x){ return x && x.parentRegionId === rid; })
                           .sort(function(a,b){ return (__indexById[a.id]||0) - (__indexById[b.id]||0); });
              }
              var __topSeq = list.filter(function(x){ return x && (x.type === 'region' || !x.parentRegionId); })
                                 .sort(function(a,b){ return (__indexById[a.id]||0) - (__indexById[b.id]||0); });
              var numMap = {};
              var __top = 0;
              __topSeq.forEach(function(x){
                if (x.type === 'region'){
                  __top++; numMap[x.id] = String(__top);
                  var __ch = __childrenOf(x.id);
                  for (var i2=0; i2<__ch.length; i2++){
                    numMap[__ch[i2].id] = String(__top) + '.' + String(i2+1);
                  }
                } else {
                  __top++; numMap[x.id] = String(__top);
                }
              });
              // 记录各区域的子项目容器，供子项目插入
              var regionChildrenContainers = {};
              // 若子项目在其区域之前被遍历，暂存到待挂载池，等区域容器创建后再挂载
              var pendingChildrenByRegionId = {};
              list.forEach(function(it, idx){
                if (!it) return;
                var wrap = document.createElement('div');
                wrap.className = 'item-controls';

                var head = document.createElement('div');
                head.className = 'item-header';
                var title = document.createElement('span');
                var displayType = (function(){
                  try { return Utils.typeName ? Utils.typeName(it.type) : it.type; } catch(_e){ return it.type; }
                })();
                title.textContent = String(numMap[it.id] || (idx+1)) + '. ' + String(it.label || (it.type === 'longtext' ? '说明' : (it.type === 'bar' ? '进度' : '标签'))) + ' (' + displayType + ')';
                var btnDel = document.createElement('button');
                btnDel.className = 'btn-delete';
                btnDel.textContent = 'X';
                btnDel.title = '删除该项目';
                btnDel.addEventListener('click', function(){ removeItemById(it.id); });
                head.appendChild(title);
                head.appendChild(btnDel);
                wrap.appendChild(head);

                // 仅为“长文字”提供独立设置控件
                if (it.type === 'longtext') {
                  // 表单容器
                  var form = document.createElement('div');
                  form.className = 'control-group';
                  form.style.display = 'grid';
                  form.style.gap = '10px';

                  // 标签
                  (function(){
                    var labWrap = document.createElement('div');
                    var lab = document.createElement('label');
                    lab.textContent = '标签';
                    labWrap.appendChild(lab);
                    var input = document.createElement('input');
                    input.type = 'text';
                    input.value = String(it.label || '');
                    input.placeholder = '例如：说明';
                    input.addEventListener('input', function(){
                      var nextLabel = String(input.value || '');
                      updateItemById(it.id, { label: nextLabel });
                      // 即时同步上方标题，减少认知延迟
                      try {
                        title.textContent = String(numMap[it.id] || (idx + 1)) + '. ' + (nextLabel || (it.type === 'longtext' ? '说明' : '')) + ' (' + displayType + ')';
                      } catch(_e){}
                      // 预览刷新交由 Ny.Render/Exporter 处理；此处不整体重绘编辑器以避免抖动
                    });
                    labWrap.appendChild(input);
                    form.appendChild(labWrap);
                  })();

                  // 长文字内容
                  (function(){
                    var vWrap = document.createElement('div');
                    var lab = document.createElement('label');
                    lab.textContent = '长文字';
                    vWrap.appendChild(lab);
                    var ta = document.createElement('textarea');
                    ta.placeholder = '在此填写长段文字…';
                    ta.value = String(it.value || '');
                    ta.style.minHeight = '84px';
                    ta.addEventListener('input', function(){
                      updateItemById(it.id, { value: String(ta.value || '') });
                    });
                    vWrap.appendChild(ta);
                    form.appendChild(vWrap);
                  })();

                  // 分组：行间距 ~ 动画特效（可折叠，视觉仅限前端）
                  var ltGroup = document.createElement('div');
                  ltGroup.className = 'inline-subbox';
                  var ltTitle = document.createElement('div');
                  ltTitle.className = 'form-box-title';
                  ltTitle.textContent = '长文字 · 行间距与动画特效';
                  ltGroup.appendChild(ltTitle);
                  // 折叠绑定（不影响数据与导出）
                  ltGroup.classList.add('collapsible');
                  ltTitle.setAttribute('tabindex','0');
                  ltTitle.addEventListener('click', function(){ ltGroup.classList.toggle('collapsed'); });
                  ltTitle.addEventListener('keydown', function(e){
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ltGroup.classList.toggle('collapsed'); }
                  });

                  // 行间距
                  (function(){
                    var row = document.createElement('div');
                    row.className = 'range-row';
                    var lab = document.createElement('label');
                    lab.textContent = '行间距';
                    row.appendChild(lab);
                    var range = document.createElement('input');
                    range.type = 'range';
                    range.min = '1.00';
                    range.max = '3.00';
                    range.step = '0.05';
                    var lh = (typeof it.ltLineHeight === 'number' ? it.ltLineHeight : 1.6);
                    range.value = String(lh);
                    var pill = document.createElement('span');
                    pill.className = 'value-pill';
                    var vv = document.createElement('span');
                    vv.textContent = lh.toFixed(2);
                    pill.appendChild(vv);
                    row.appendChild(range);
                    row.appendChild(pill);
                    range.addEventListener('input', function(){
                      var v = clamp(parseFloat(range.value)||1.6, 1.0, 3.0);
                      vv.textContent = v.toFixed(2);
                    });
                    range.addEventListener('change', function(){
                      var v = clamp(parseFloat(range.value)||1.6, 1.0, 3.0);
                      updateItemById(it.id, { ltLineHeight: v });
                    });
                    ltGroup.appendChild(row);
                  })();

                  // 新增：空出首行（可选）
                  (function(){
                    var row = document.createElement('div');
                    row.style.display = 'flex';
                    row.style.alignItems = 'center';
                    row.style.gap = '8px';
                    var cb = document.createElement('input');
                    cb.type = 'checkbox';
                    cb.id = 'lt-skip-first-' + it.id;
                    cb.checked = !!it.ltSkipFirstLine;
                    var lab = document.createElement('label');
                    lab.setAttribute('for', cb.id);
                    lab.textContent = '空出首行（留出一行行高的上边距）';
                    cb.addEventListener('change', function(){
                      updateItemById(it.id, { ltSkipFirstLine: !!cb.checked });
                    });
                    row.appendChild(cb);
                    row.appendChild(lab);
                    ltGroup.appendChild(row);
                  })();

                  // 新增：首字缩进(px)
                  (function(){
                    var row = document.createElement('div');
                    var lab = document.createElement('label');
                    lab.textContent = '首字缩进(px)';
                    var input = document.createElement('input');
                    input.type = 'number';
                    input.min = '0';
                    input.step = '1';
                    input.value = String(isFinite(it.ltFirstIndentPx) ? Math.max(0, Number(it.ltFirstIndentPx)) : 0);
                    input.addEventListener('change', function(){
                      var v = Math.max(0, parseInt(input.value, 10) || 0);
                      input.value = String(v);
                      updateItemById(it.id, { ltFirstIndentPx: v });
                    });
                    row.appendChild(lab);
                    row.appendChild(input);
                    ltGroup.appendChild(row);
                  })();

                  // 新增：四边距（px）
                  (function(){
                    var box = document.createElement('div');
                    var lab = document.createElement('label');
                    lab.textContent = '长文字与边框的距离（内边距，px）';
                    box.appendChild(lab);

                    var grid = document.createElement('div');
                    grid.style.display = 'grid';
                    grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
                    grid.style.gap = '8px';

                    function makePadCell(name, key){
                      var cell = document.createElement('div');
                      var l = document.createElement('span');
                      l.textContent = name;
                      l.style.fontSize = '12px';
                      l.style.opacity = '.8';
                      var ip = document.createElement('input');
                      ip.type = 'number'; ip.min = '0'; ip.step = '1';
                      ip.value = String(isFinite(it[key]) ? Math.max(0, Number(it[key])) : 0);
                      ip.addEventListener('change', function(){
                        var v = Math.max(0, parseInt(ip.value, 10) || 0);
                        ip.value = String(v);
                        var patch = {}; patch[key] = v;
                        updateItemById(it.id, patch);
                      });
                      cell.appendChild(l);
                      cell.appendChild(ip);
                      return cell;
                    }
                    grid.appendChild(makePadCell('上', 'ltPadTopPx'));
                    grid.appendChild(makePadCell('右', 'ltPadRightPx'));
                    grid.appendChild(makePadCell('下', 'ltPadBottomPx'));
                    grid.appendChild(makePadCell('左', 'ltPadLeftPx'));

                    box.appendChild(grid);
                    ltGroup.appendChild(box);
                  })();

                  // 动画特效（放在行间距之下，且位于以下“空出首行/缩进/四边距”之后）
                  (function(){
                    var cell = document.createElement('div');
                    var lab = document.createElement('label');
                    lab.textContent = '动画特效';
                    cell.appendChild(lab);
                    var sel = document.createElement('select');
                    [
                      {v:'none', text:'无'},
                      {v:'fade', text:'淡入'},
                      {v:'slide', text:'上移出现'},
                      {v:'typewriter', text:'打字机'}
                    ].forEach(function(opt){
                      var o = document.createElement('option');
                      o.value = opt.v; o.textContent = opt.text;
                      sel.appendChild(o);
                    });
                    sel.value = String(it.ltEffect || 'none');

                    // 打字机选项容器（仅在“打字机”被选择时显示）
                    var twBox = document.createElement('div');
                    twBox.className = 'control-group';

                    // 速度(毫秒/字符)
                    (function(){
                      var row = document.createElement('div');
                      row.className = 'range-row';
                      var lb = document.createElement('label');
                      lb.textContent = '速度(毫秒/字符)';
                      row.appendChild(lb);
                      var range = document.createElement('input');
                      range.type = 'range';
                      range.min = '5';
                      range.max = '200';
                      range.step = '1';
                      var defSpd = (isFinite(it.ltTwSpeedMs) ? clamp(parseInt(it.ltTwSpeedMs,10)||18, 5, 200) : 18);
                      range.value = String(defSpd);
                      var pill = document.createElement('span');
                      pill.className = 'value-pill';
                      var vv = document.createElement('span');
                      vv.textContent = String(defSpd);
                      pill.appendChild(vv);
                      row.appendChild(range);
                      row.appendChild(pill);
                      range.addEventListener('input', function(){
                        var v = clamp(parseInt(range.value,10)||18, 5, 200);
                        vv.textContent = String(v);
                      });
                      range.addEventListener('change', function(){
                        var v = clamp(parseInt(range.value,10)||18, 5, 200);
                        updateItemById(it.id, { ltTwSpeedMs: v });
                      });
                      twBox.appendChild(row);
                    })();

                    // 开始延迟(ms)
                    (function(){
                      var row = document.createElement('div');
                      var lb = document.createElement('label');
                      lb.textContent = '开始延迟(ms)';
                      var input = document.createElement('input');
                      input.type = 'number';
                      input.min = '0';
                      input.step = '50';
                      input.value = String(isFinite(it.ltTwDelayMs) ? Math.max(0, parseInt(it.ltTwDelayMs,10)||0) : 0);
                      input.addEventListener('change', function(){
                        var v = Math.max(0, parseInt(input.value,10)||0);
                        input.value = String(v);
                        updateItemById(it.id, { ltTwDelayMs: v });
                      });
                      row.appendChild(lb);
                      row.appendChild(input);
                      twBox.appendChild(row);
                    })();

                    // 光标闪烁
                    (function(){
                      var row = document.createElement('div');
                      row.style.display = 'flex';
                      row.style.alignItems = 'center';
                      row.style.gap = '8px';
                      var cb = document.createElement('input');
                      cb.type = 'checkbox';
                      cb.id = 'lt-tw-caret-' + it.id;
                      cb.checked = (it.ltTwCaret !== false);
                      var lb = document.createElement('label');
                      lb.setAttribute('for', cb.id);
                      lb.textContent = '显示光标闪烁';
                      cb.addEventListener('change', function(){
                        updateItemById(it.id, { ltTwCaret: !!cb.checked });
                      });
                      row.appendChild(cb);
                      row.appendChild(lb);
                      twBox.appendChild(row);
                    })();

                    function updateTwBox(){
                      twBox.style.display = (String(sel.value) === 'typewriter') ? '' : 'none';
                    }
                    updateTwBox();

                    sel.addEventListener('change', function(){
                      updateItemById(it.id, { ltEffect: String(sel.value || 'none') });
                      updateTwBox();
                    });

                    cell.appendChild(sel);
                    ltGroup.appendChild(cell);
                    ltGroup.appendChild(twBox);
                  })();

                  // 将分组盒添加进表单
                  form.appendChild(ltGroup);
 
                  wrap.appendChild(form);
                }
 
                // 新增：区域标题设置（仅当该项为“区域”时渲染）
                (function addRegionTitleControls(){
                  try{
                    if (it.type !== 'region') return;
                    // 分组盒（可视小标题）
                    // 折叠按钮（编辑器）：点击后更新该区域的 collapsed 状态，子项目随之折叠
                    var btnFold = document.createElement('button');
                    btnFold.className = 'btn-fold';
                    btnFold.title = '折叠/展开区域';
                    btnFold.textContent = (it.collapsed ? '▶' : '▾');
                    btnFold.addEventListener('click', function(){
                      updateItemById(it.id, { collapsed: !it.collapsed });
                    });
                    try { head.insertBefore(btnFold, btnDel); } catch(_e){}

                    var box = document.createElement('div');
                    box.className = 'inline-subbox';
                    var boxTitle = document.createElement('div');
                    boxTitle.className = 'form-box-title';
                    boxTitle.textContent = '区域标题 · 样式';
                    box.appendChild(boxTitle);

                    var form = document.createElement('div');
                    form.className = 'control-group';
                    form.style.display = 'grid';
                    form.style.gap = '10px';

                    // 标签（区域标题）
                    (function(){
                      var labWrap = document.createElement('div');
                      var lab = document.createElement('label');
                      lab.textContent = '区域标题';
                      labWrap.appendChild(lab);
                      var input = document.createElement('input');
                      input.type = 'text';
                      input.value = String(it.label || '区域');
                      input.placeholder = '例如：基础信息';
                      input.addEventListener('input', function(){
                        var nextLabel = String(input.value || '');
                        updateItemById(it.id, { label: nextLabel });
                        try {
                          title.textContent = String(numMap[it.id] || (idx + 1)) + '. ' + (nextLabel || '区域') + ' (' + displayType + ')';
                        } catch(_e){}
                      });
                      labWrap.appendChild(input);
                      form.appendChild(labWrap);
                    })();

                    // 对齐方式
                    (function(){
                      var row = document.createElement('div');
                      var lab = document.createElement('label');
                      lab.textContent = '标题对齐';
                      row.appendChild(lab);
                      var sel = document.createElement('select');
                      [['left','居左'],['center','居中'],['right','居右']].forEach(function(p){
                        var o = document.createElement('option');
                        o.value = p[0]; o.textContent = p[1];
                        sel.appendChild(o);
                      });
                      sel.value = String(it.rtAlign || 'left');
                      sel.addEventListener('change', function(){
                        updateItemById(it.id, { rtAlign: String(sel.value || 'left') });
                      });
                      row.appendChild(sel);
                      form.appendChild(row);
                    })();

                    // 字号与字重
                    (function(){
                      var grid = document.createElement('div');
                      grid.style.display = 'grid';
                      grid.style.gridTemplateColumns = '1fr 1fr';
                      grid.style.gap = '10px';

                      // 字号
                      var sizeRow = document.createElement('div');
                      sizeRow.className = 'range-row';
                      var sizeLab = document.createElement('label');
                      sizeLab.textContent = '标题字号';
                      sizeRow.appendChild(sizeLab);
                      var sizeRange = document.createElement('input');
                      sizeRange.type = 'range';
                      sizeRange.min = '12'; sizeRange.max = '36'; sizeRange.step = '1';
                      var defSz = (isFinite(it.rtFontSize) ? Number(it.rtFontSize) : (isFinite(State.customization && State.customization.globalLabelFontSize) ? Number(State.customization.globalLabelFontSize) : 16));
                      sizeRange.value = String(defSz);
                      var sizePill = document.createElement('span');
                      sizePill.className = 'value-pill';
                      var sizeVal = document.createElement('span');
                      sizeVal.textContent = String(defSz);
                      sizePill.appendChild(sizeVal);
                      sizePill.appendChild(document.createTextNode('px'));
                      sizeRow.appendChild(sizeRange);
                      sizeRow.appendChild(sizePill);
                      sizeRange.addEventListener('input', function(){
                        var v = Math.max(10, Math.min(48, parseInt(sizeRange.value,10)||16));
                        sizeVal.textContent = String(v);
                      });
                      sizeRange.addEventListener('change', function(){
                        var v = Math.max(10, Math.min(48, parseInt(sizeRange.value,10)||16));
                        updateItemById(it.id, { rtFontSize: v });
                      });

                      // 字重
                      var weightCell = document.createElement('div');
                      var wLab = document.createElement('label');
                      wLab.textContent = '标题字重';
                      weightCell.appendChild(wLab);
                      var wSel = document.createElement('select');
                      ['400','500','600','700'].forEach(function(w){
                        var o = document.createElement('option');
                        o.value = w; o.textContent = ({'400':'常规(400)','500':'中等(500)','600':'半粗(600)','700':'加粗(700)'}[w]);
                        wSel.appendChild(o);
                      });
                      wSel.value = String(isFinite(it.rtWeight) ? it.rtWeight : (isFinite(State.customization && State.customization.globalLabelWeight) ? State.customization.globalLabelWeight : 500));
                      wSel.addEventListener('change', function(){
                        var v = parseInt(wSel.value,10)||500;
                        updateItemById(it.id, { rtWeight: v });
                      });
                      weightCell.appendChild(wSel);

                      grid.appendChild(sizeRow);
                      grid.appendChild(weightCell);
                      form.appendChild(grid);
                    })();

                    // 倾斜/大写
                    (function(){
                      var row = document.createElement('div');
                      row.style.display = 'flex';
                      row.style.alignItems = 'center';
                      row.style.gap = '8px';
                      var cbItalic = document.createElement('input');
                      cbItalic.type = 'checkbox';
                      cbItalic.id = 'rt-italic-' + it.id;
                      cbItalic.checked = !!it.rtItalic;
                      var lbItalic = document.createElement('label');
                      lbItalic.setAttribute('for', cbItalic.id);
                      lbItalic.textContent = '倾斜';
                      cbItalic.addEventListener('change', function(){
                        updateItemById(it.id, { rtItalic: !!cbItalic.checked });
                      });
    
                      var cbUpper = document.createElement('input');
                      cbUpper.type = 'checkbox';
                      cbUpper.id = 'rt-upper-' + it.id;
                      cbUpper.checked = !!it.rtUppercase;
                      var lbUpper = document.createElement('label');
                      lbUpper.setAttribute('for', cbUpper.id);
                      lbUpper.textContent = '大写';
                      cbUpper.addEventListener('change', function(){
                        updateItemById(it.id, { rtUppercase: !!cbUpper.checked });
                      });
    
                      row.appendChild(cbItalic);
                      row.appendChild(lbItalic);
                      row.appendChild(cbUpper);
                      row.appendChild(lbUpper);
                      form.appendChild(row);
                    })();
    
                    // 标题上方间距(px)
                    (function(){
                      var mrTopRow = document.createElement('div');
                      mrTopRow.className = 'range-row';
                      var lab = document.createElement('label');
                      lab.textContent = '标题上方间距(px)';
                      mrTopRow.appendChild(lab);
                      var range = document.createElement('input');
                      range.type = 'range';
                      range.min = '0'; range.max = '24'; range.step = '1';
                      var def = isFinite(it.rtHeaderMarginTopPx) ? Number(it.rtHeaderMarginTopPx) : 6;
                      range.value = String(def);
                      var pill = document.createElement('span'); pill.className = 'value-pill';
                      var vv = document.createElement('span'); vv.textContent = String(def);
                      pill.appendChild(vv); pill.appendChild(document.createTextNode('px'));
                      mrTopRow.appendChild(range); mrTopRow.appendChild(pill);
                      range.addEventListener('input', function(){
                        var v = Math.max(0, Math.min(24, parseInt(range.value,10) || 0));
                        vv.textContent = String(v);
                      });
                      range.addEventListener('change', function(){
                        var v = Math.max(0, Math.min(24, parseInt(range.value,10) || 0));
                        updateItemById(it.id, { rtHeaderMarginTopPx: v });
                      });
                      form.appendChild(mrTopRow);
                    })();
    
                    // 标题下方（至子项目）间距(px)
                    (function(){
                      var mrBotRow = document.createElement('div');
                      mrBotRow.className = 'range-row';
                      var lab = document.createElement('label');
                      lab.textContent = '标题下方（至子项目）间距(px)';
                      mrBotRow.appendChild(lab);
                      var range = document.createElement('input');
                      range.type = 'range';
                      range.min = '0'; range.max = '24'; range.step = '1';
                      var def = isFinite(it.rtHeaderMarginBottomPx) ? Number(it.rtHeaderMarginBottomPx) : 6;
                      range.value = String(def);
                      var pill = document.createElement('span'); pill.className = 'value-pill';
                      var vv = document.createElement('span'); vv.textContent = String(def);
                      pill.appendChild(vv); pill.appendChild(document.createTextNode('px'));
                      mrBotRow.appendChild(range); mrBotRow.appendChild(pill);
                      range.addEventListener('input', function(){
                        var v = Math.max(0, Math.min(24, parseInt(range.value,10) || 0));
                        vv.textContent = String(v);
                      });
                      range.addEventListener('change', function(){
                        var v = Math.max(0, Math.min(24, parseInt(range.value,10) || 0));
                        updateItemById(it.id, { rtHeaderMarginBottomPx: v });
                      });
                      form.appendChild(mrBotRow);
                    })();

                    // 下划线
                    (function(){
                      var box = document.createElement('div');
                      var lab = document.createElement('label');
                      lab.textContent = '下划线';
                      box.appendChild(lab);

                      var grid = document.createElement('div');
                      grid.style.display = 'grid';
                      grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
                      grid.style.gap = '10px';

                      // 样式
                      var styleCell = document.createElement('div');
                      var sLab = document.createElement('label');
                      sLab.textContent = '样式';
                      styleCell.appendChild(sLab);
                      var sSel = document.createElement('select');
                      ['none','solid','dashed','dotted','double','wavy'].forEach(function(v){
                        var o = document.createElement('option');
                        o.value = v; o.textContent = ({none:'无',solid:'实线',dashed:'虚线',dotted:'点线',double:'双线',wavy:'波浪'})[v];
                        sSel.appendChild(o);
                      });
                      sSel.value = String(it.rtUnderlineStyle || 'none');
                      sSel.addEventListener('change', function(){
                        updateItemById(it.id, { rtUnderlineStyle: String(sSel.value || 'none') });
                      });
                      styleCell.appendChild(sSel);

                      // 颜色
                      var colorCell = document.createElement('div');
                      var cLab = document.createElement('label');
                      cLab.textContent = '颜色';
                      colorCell.appendChild(cLab);
                      var cInput = document.createElement('input');
                      cInput.type = 'color';
                      var defColor = String((it.rtUnderlineColor != null ? it.rtUnderlineColor : (State.customization && (State.customization.section2LabelColor || State.customization.secondaryColor || '#6a717c'))));
                      cInput.value = defColor;
                      cInput.addEventListener('input', function(){
                        updateItemById(it.id, { rtUnderlineColor: String(cInput.value || defColor) });
                      });
                      colorCell.appendChild(cInput);

                      grid.appendChild(styleCell);
                      grid.appendChild(colorCell);

                      // 厚度与偏移
                      var grid2 = document.createElement('div');
                      grid2.style.display = 'grid';
                      grid2.style.gridTemplateColumns = '1fr 1fr';
                      grid2.style.gap = '10px';

                      var thickRow = document.createElement('div');
                      thickRow.className = 'range-row';
                      var tLab = document.createElement('label');
                      tLab.textContent = '厚度(px)';
                      thickRow.appendChild(tLab);
                      var tRange = document.createElement('input');
                      tRange.type = 'range';
                      tRange.min = '1'; tRange.max = '8'; tRange.step = '1';
                      var defThick = isFinite(it.rtUnderlineThickness) ? Number(it.rtUnderlineThickness) : 2;
                      tRange.value = String(defThick);
                      var tPill = document.createElement('span');
                      tPill.className = 'value-pill';
                      var tVal = document.createElement('span');
                      tVal.textContent = String(defThick);
                      tPill.appendChild(tVal);
                      tPill.appendChild(document.createTextNode('px'));
                      thickRow.appendChild(tRange);
                      thickRow.appendChild(tPill);
                      tRange.addEventListener('input', function(){
                        var v = Math.max(1, Math.min(12, parseInt(tRange.value,10)||2));
                        tVal.textContent = String(v);
                      });
                      tRange.addEventListener('change', function(){
                        var v = Math.max(1, Math.min(12, parseInt(tRange.value,10)||2));
                        updateItemById(it.id, { rtUnderlineThickness: v });
                      });

                      var offRow = document.createElement('div');
                      offRow.className = 'range-row';
                      var oLab = document.createElement('label');
                      oLab.textContent = '偏移(px)';
                      offRow.appendChild(oLab);
                      var oRange = document.createElement('input');
                      oRange.type = 'range';
                      oRange.min = '0'; oRange.max = '20'; oRange.step = '1';
                      var defOff = isFinite(it.rtUnderlineOffset) ? Number(it.rtUnderlineOffset) : 4;
                      oRange.value = String(defOff);
                      var oPill = document.createElement('span');
                      oPill.className = 'value-pill';
                      var oVal = document.createElement('span');
                      oVal.textContent = String(defOff);
                      oPill.appendChild(oVal);
                      oPill.appendChild(document.createTextNode('px'));
                      offRow.appendChild(oRange);
                      offRow.appendChild(oPill);
                      oRange.addEventListener('input', function(){
                        var v = Math.max(0, Math.min(24, parseInt(oRange.value,10)||4));
                        oVal.textContent = String(v);
                      });
                      oRange.addEventListener('change', function(){
                        var v = Math.max(0, Math.min(24, parseInt(oRange.value,10)||4));
                        updateItemById(it.id, { rtUnderlineOffset: v });
                      });

                      box.appendChild(grid);
                      box.appendChild(grid2);
                      form.appendChild(thickRow);
                      form.appendChild(offRow);
                      form.appendChild(box);
                    })();

                    // 颜色模式（主题/纯色/渐变）
                    (function(){
                      var box = document.createElement('div');
                      var lab = document.createElement('label');
                      lab.textContent = '标题颜色模式';
                      box.appendChild(lab);
                      var sel = document.createElement('select');
                      [['theme','跟随主题'],['solid','纯色'],['gradient','渐变']].forEach(function(p){
                        var o = document.createElement('option');
                        o.value = p[0]; o.textContent = p[1];
                        sel.appendChild(o);
                      });
                      sel.value = String(it.rtColorMode || 'theme');
                      box.appendChild(sel);

                      var solidGroup = document.createElement('div');
                      solidGroup.className = 'control-group';
                      var sLab = document.createElement('label');
                      sLab.textContent = '纯色';
                      solidGroup.appendChild(sLab);
                      var sColor = document.createElement('input');
                      sColor.type = 'color';
                      sColor.value = String(it.rtColorSolid || (State.customization && (State.customization.section2LabelColor || State.customization.secondaryColor || '#6a717c')));
                      sColor.addEventListener('input', function(){
                        updateItemById(it.id, { rtColorSolid: String(sColor.value || '') });
                      });
                      solidGroup.appendChild(sColor);

                      var gradGroup = document.createElement('div');
                      gradGroup.className = 'control-group';
                      var gLab = document.createElement('label');
                      gLab.textContent = '渐变';
                      gradGroup.appendChild(gLab);
                      var grid = document.createElement('div');
                      grid.style.display = 'grid';
                      grid.style.gridTemplateColumns = '1fr 1fr';
                      grid.style.gap = '10px';

                      var gStartWrap = document.createElement('div');
                      var gSLab = document.createElement('label');
                      gSLab.textContent = '起色';
                      gStartWrap.appendChild(gSLab);
                      var gStart = document.createElement('input');
                      gStart.type = 'color';
                      gStart.value = String(it.rtGradStart || ((State && State.customization && State.customization.primaryColor) || '#6a717c'));
                      gStart.addEventListener('input', function(){
                        updateItemById(it.id, { rtGradStart: String(gStart.value || '') });
                      });
                      gStartWrap.appendChild(gStart);

                      var gEndWrap = document.createElement('div');
                      var gELab = document.createElement('label');
                      gELab.textContent = '终色';
                      gEndWrap.appendChild(gELab);
                      var gEnd = document.createElement('input');
                      gEnd.type = 'color';
                      gEnd.value = String(it.rtGradEnd || ((State && State.customization && State.customization.secondaryColor) || '#97aec8'));
                      gEnd.addEventListener('input', function(){
                        updateItemById(it.id, { rtGradEnd: String(gEnd.value || '') });
                      });
                      gEndWrap.appendChild(gEnd);

                      grid.appendChild(gStartWrap);
                      grid.appendChild(gEndWrap);

                      var angleRow = document.createElement('div');
                      angleRow.className = 'range-row';
                      var aLab = document.createElement('label');
                      aLab.textContent = '角度(°)';
                      angleRow.appendChild(aLab);
                      var aRange = document.createElement('input');
                      aRange.type = 'range';
                      aRange.min = '0'; aRange.max = '360'; aRange.step = '1';
                      var defAng = isFinite(it.rtGradAngle) ? Number(it.rtGradAngle) : 0;
                      aRange.value = String(defAng);
                      var aPill = document.createElement('span');
                      aPill.className = 'value-pill';
                      var aVal = document.createElement('span');
                      aVal.textContent = String(defAng);
                      aPill.appendChild(aVal);
                      aPill.appendChild(document.createTextNode('°'));
                      angleRow.appendChild(aRange);
                      angleRow.appendChild(aPill);
                      aRange.addEventListener('input', function(){
                        var v = Math.max(0, Math.min(360, parseInt(aRange.value,10)||0));
                        aVal.textContent = String(v);
                      });
                      aRange.addEventListener('change', function(){
                        var v = Math.max(0, Math.min(360, parseInt(aRange.value,10)||0));
                        updateItemById(it.id, { rtGradAngle: v });
                      });

                      gradGroup.appendChild(grid);
                      gradGroup.appendChild(angleRow);

                      function updateVis(){
                        var m = String(sel.value || 'theme');
                        solidGroup.style.display = (m === 'solid') ? '' : 'none';
                        gradGroup.style.display = (m === 'gradient') ? '' : 'none';
                      }
                      updateVis();
                      sel.addEventListener('change', function(){
                        var m = String(sel.value || 'theme');
                        updateItemById(it.id, { rtColorMode: m });
                        updateVis();
                      });

                      form.appendChild(box);
                      form.appendChild(solidGroup);
                      form.appendChild(gradGroup);
                    })();

                    box.appendChild(form);
                    // 先挂载“区域标题 · 样式”盒到当前项
                    wrap.appendChild(box);

                    // 新增：区域 · 折叠设置（位于“区域标题 · 样式”之下，“区域 · 添加子项目”之上）
                    (function addRegionFoldSettings(){
                      try{
                        var foldBox = document.createElement('div');
                        foldBox.className = 'inline-subbox region-fold-settings-box';
                        foldBox.id = 'region-fold-settings-' + it.id;
                        var foldTitle = document.createElement('div');
                        foldTitle.className = 'form-box-title';
                        foldTitle.textContent = '区域 · 折叠设置';
                        foldBox.appendChild(foldTitle);
                        // 使该子框可折叠，行为与“区域标题 · 样式”一致
                        try{
                          foldBox.classList.add('collapsible');
                          foldTitle.setAttribute('tabindex','0');
                          foldTitle.addEventListener('click', function(){ foldBox.classList.toggle('collapsed'); });
                          foldTitle.addEventListener('keydown', function(e){
                            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); foldBox.classList.toggle('collapsed'); }
                          });
                        }catch(_eFoldBind){}

                        var cg = document.createElement('div');
                        cg.className = 'control-group';
                        cg.style.display = 'grid';
                        cg.style.gap = '10px';

                        // 导出时默认折叠
                        (function(){
                          var row = document.createElement('div');
                          row.style.display = 'flex';
                          row.style.alignItems = 'center';
                          row.style.gap = '8px';
                          var cb = document.createElement('input');
                          cb.type = 'checkbox';
                          cb.id = 'rt-export-collapsed-' + it.id;
                          cb.checked = !!it.rtExportCollapsed;
                          var lb = document.createElement('label');
                          lb.setAttribute('for', cb.id);
                          lb.textContent = '导出时默认折叠';
                          cb.addEventListener('change', function(){
                            updateItemById(it.id, { rtExportCollapsed: !!cb.checked });
                          });
                          row.appendChild(cb);
                          row.appendChild(lb);
                          cg.appendChild(row);
                        })();

                        // 点击什么折叠/展开（标题/图标/整行）
                        (function(){
                          var row = document.createElement('div');
                          var lab = document.createElement('label');
                          lab.textContent = '点击什么折叠/展开';
                          row.appendChild(lab);
                          var sel = document.createElement('select');
                          [['header','整行（标题/图标）'],['title','标题部分'],['icon','图标']].forEach(function(p){
                            var o = document.createElement('option');
                            o.value = p[0]; o.textContent = p[1];
                            sel.appendChild(o);
                          });
                          sel.value = String(it.rtToggleMode || 'header');
                          sel.addEventListener('change', function(){
                            updateItemById(it.id, { rtToggleMode: String(sel.value || 'header') });
                          });
                          row.appendChild(sel);
                          cg.appendChild(row);
                        })();

                        // 设置折叠按钮图标（内置/自定义）
                        (function(){
                          var box2 = document.createElement('div');
                          var lab = document.createElement('label');
                          lab.textContent = '折叠按钮图标';
                          box2.appendChild(lab);

                          var grid = document.createElement('div');
                          grid.style.display = 'grid';
                          grid.style.gridTemplateColumns = '1fr 1fr';
                          grid.style.gap = '10px';

                          var styleSel = document.createElement('select');
                          [['triangle','三角（▾/▶）'],['plusminus','加减（+/−）'],['arrow','箭头（↓/→）'],['custom','自定义']].forEach(function(p){
                            var o = document.createElement('option');
                            o.value = p[0]; o.textContent = p[1];
                            styleSel.appendChild(o);
                          });
                          styleSel.value = String(it.rtToggleIconStyle || 'triangle');

                          var customWrap = document.createElement('div');
                          customWrap.className = 'control-group';
                          var lab1 = document.createElement('label');
                          lab1.textContent = '展开图标';
                          var inpExp = document.createElement('input');
                          inpExp.type = 'text';
                          inpExp.placeholder = '例如：▾';
                          inpExp.value = String(it.rtToggleIconExp || '');
                          var lab2 = document.createElement('label');
                          lab2.textContent = '折叠图标';
                          var inpCol = document.createElement('input');
                          inpCol.type = 'text';
                          inpCol.placeholder = '例如：▶';
                          inpCol.value = String(it.rtToggleIconCol || '');
                          customWrap.appendChild(lab1);
                          customWrap.appendChild(inpExp);
                          customWrap.appendChild(lab2);
                          customWrap.appendChild(inpCol);

                          function updateVis(){
                            customWrap.style.display = (String(styleSel.value) === 'custom') ? '' : 'none';
                          }
                          updateVis();

                          styleSel.addEventListener('change', function(){
                            var v = String(styleSel.value || 'triangle');
                            updateItemById(it.id, { rtToggleIconStyle: v });
                            updateVis();
                          });
                          inpExp.addEventListener('change', function(){
                            updateItemById(it.id, { rtToggleIconExp: String(inpExp.value || '') });
                          });
                          inpCol.addEventListener('change', function(){
                            updateItemById(it.id, { rtToggleIconCol: String(inpCol.value || '') });
                          });

                          grid.appendChild(styleSel);
                          grid.appendChild(customWrap);
                          box2.appendChild(grid);
                          cg.appendChild(box2);
                        })();

                        /* 已移除：折叠后标题背景设置（rtCollapsedBg*） */
 
                        foldBox.appendChild(cg);
                        // 插入到“区域标题 · 样式”之后（同级子框，避免受上方折叠影响）
                        wrap.appendChild(foldBox);
                        // Debug：确保“区域 · 折叠设置”已挂载
                        try { console.log('[ItemsEditor] FoldSettings mounted', it && it.id); } catch(_eLog){}
                        // Fallback: 如果“区域 · 折叠美化与动画”未挂载，先插入一个可折叠的占位盒，避免不可见
                        try {
                          if (!wrap.querySelector('.region-collapsed-beautify-box')) {
                            var __beautifyBox = document.createElement('div');
                            __beautifyBox.className = 'inline-subbox region-collapsed-beautify-box';
                            __beautifyBox.setAttribute('data-fallback','1');
                            var __bTitle = document.createElement('div');
                            __bTitle.className = 'form-box-title';
                            __bTitle.textContent = '区域 · 折叠美化与动画';
                            __beautifyBox.appendChild(__bTitle);
                            __beautifyBox.classList.add('collapsible');
                            __bTitle.setAttribute('tabindex','0');
                            __bTitle.addEventListener('click', function(){ __beautifyBox.classList.toggle('collapsed'); });
                            __bTitle.addEventListener('keydown', function(e){
                              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); __beautifyBox.classList.toggle('collapsed'); }
                            });
                            // 最小控件：折叠头部背景模式 + 纯色/渐变分支
                            var __bcg = document.createElement('div');
                            __bcg.className = 'control-group';
                            __bcg.style.display = 'grid';
                            __bcg.style.gap = '10px';
                            var __lab = document.createElement('label');
                            __lab.textContent = '折叠头部背景模式';
                            __bcg.appendChild(__lab);
                            var __sel = document.createElement('select');
                            [['none','无'],['solid','纯色'],['gradient','渐变'],['glass','玻璃（CSS 效果）']].forEach(function(p){
                              var o = document.createElement('option'); o.value=p[0]; o.textContent=p[1]; __sel.appendChild(o);
                            });
                            __sel.value = String(it.rtCollapsedBgMode || 'gradient');
                            __sel.addEventListener('change', function(){
                              updateItemById(it.id, { rtCollapsedBgMode: String(__sel.value || 'none') });
                              __updateVis();
                            });
                            __bcg.appendChild(__sel);
                            var __solidGroup = document.createElement('div');
                            __solidGroup.className = 'control-group';
                            var __sLab = document.createElement('label'); __sLab.textContent = '折叠头部纯色';
                            __solidGroup.appendChild(__sLab);
                            var __sColor = document.createElement('input'); __sColor.type='color';
                            __sColor.value = String(it.rtCollapsedBgColor || (Ny.State && Ny.State.customization && Ny.State.customization.primaryColor) || '#6a717c');
                            __sColor.addEventListener('input', function(){ updateItemById(it.id, { rtCollapsedBgColor: String(__sColor.value || '') }); });
                            __solidGroup.appendChild(__sColor);
                            var __gradGroup = document.createElement('div');
                            __gradGroup.className = 'control-group';
                            var __gLab = document.createElement('label'); __gLab.textContent = '折叠头部渐变';
                            __gradGroup.appendChild(__gLab);
                            var __grid = document.createElement('div');
                            __grid.style.display='grid'; __grid.style.gridTemplateColumns='1fr 1fr'; __grid.style.gap='10px';
                            var __gStartWrap = document.createElement('div');
                            var __gSLab = document.createElement('label'); __gSLab.textContent='起色';
                            __gStartWrap.appendChild(__gSLab);
                            var __gStart = document.createElement('input'); __gStart.type='color';
                            __gStart.value = String(it.rtCollapsedGradStart || (Ny.State && Ny.State.customization && Ny.State.customization.primaryColor) || '#6a717c');
                            __gStart.addEventListener('input', function(){ updateItemById(it.id, { rtCollapsedGradStart: String(__gStart.value || '') }); });
                            __gStartWrap.appendChild(__gStart);
                            var __gEndWrap = document.createElement('div');
                            var __gELab = document.createElement('label'); __gELab.textContent='终色';
                            __gEndWrap.appendChild(__gELab);
                            var __gEnd = document.createElement('input'); __gEnd.type='color';
                            __gEnd.value = String(it.rtCollapsedGradEnd || (Ny.State && Ny.State.customization && Ny.State.customization.secondaryColor) || '#97aec8');
                            __gEnd.addEventListener('input', function(){ updateItemById(it.id, { rtCollapsedGradEnd: String(__gEnd.value || '') }); });
                            __gEndWrap.appendChild(__gEnd);
                            __grid.appendChild(__gStartWrap);
                            __grid.appendChild(__gEndWrap);
                            __gradGroup.appendChild(__grid);
                            var __angRow = document.createElement('div'); __angRow.className='range-row';
                            var __aLab = document.createElement('label'); __aLab.textContent='角度(°)';
                            __angRow.appendChild(__aLab);
                            var __aRange = document.createElement('input'); __aRange.type='range'; __aRange.min='0'; __aRange.max='360'; __aRange.step='1';
                            var __defAng = isFinite(it.rtCollapsedGradAngle) ? Number(it.rtCollapsedGradAngle) : 135;
                            __aRange.value = String(__defAng);
                            var __aPill = document.createElement('span'); __aPill.className='value-pill';
                            var __aVal = document.createElement('span'); __aVal.textContent = String(__defAng);
                            __aPill.appendChild(__aVal); __aPill.appendChild(document.createTextNode('°'));
                            __angRow.appendChild(__aRange); __angRow.appendChild(__aPill);
                            __aRange.addEventListener('input', function(){ var v=Math.max(0, Math.min(360, parseInt(__aRange.value,10)||135)); __aVal.textContent=String(v); });
                            __aRange.addEventListener('change', function(){ var v=Math.max(0, Math.min(360, parseInt(__aRange.value,10)||135)); updateItemById(it.id, { rtCollapsedGradAngle: v }); });
                            __gradGroup.appendChild(__angRow);
                            function __updateVis(){
                              var m = String(__sel.value || 'none');
                              __solidGroup.style.display = (m === 'solid') ? '' : 'none';
                              __gradGroup.style.display  = (m === 'gradient') ? '' : 'none';
                            }
                            __updateVis();
                            __bcg.appendChild(__solidGroup);
                            __bcg.appendChild(__gradGroup);
                            __beautifyBox.appendChild(__bcg);
                            wrap.appendChild(__beautifyBox);
                            try { console.log('[ItemsEditor] BeautifyBox fallback mounted', it && it.id); } catch(_eLog2){}
                          }
                        } catch(__eFallback) {}

                        // 新增：区域 · 折叠美化与动画（头部） + 区域 · 动作动画（主体）
                        (function addRegionAppearanceAndAnim(){
                          try{
                            if (it.type !== 'region') return;

                            // 子框：区域 · 折叠美化与动画（作用于 .st-region-header 折叠态）
                            var beautifyBox = document.createElement('div');
                            beautifyBox.className = 'inline-subbox region-collapsed-beautify-box';
                            var bTitle = document.createElement('div');
                            bTitle.className = 'form-box-title';
                            bTitle.textContent = '区域 · 折叠美化与动画';
                            beautifyBox.appendChild(bTitle);
                            // 如存在占位 Fallback 盒，先移除，避免重复显示
                            try{
                              var __fallbacks = wrap.querySelectorAll('.region-collapsed-beautify-box[data-fallback="1"]');
                              __fallbacks.forEach(function(n){ try{ n.remove(); }catch(_er){} });
                            }catch(_eRm){}
                            // 使“区域 · 折叠美化与动画”子框可折叠（与其他子框一致）
                            try{
                              beautifyBox.classList.add('collapsible');
                              bTitle.setAttribute('tabindex','0');
                              bTitle.addEventListener('click', function(){ beautifyBox.classList.toggle('collapsed'); });
                              bTitle.addEventListener('keydown', function(e){
                                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); beautifyBox.classList.toggle('collapsed'); }
                              });
                            }catch(_eBeautifyC){}

                            var bcg = document.createElement('div');
                            bcg.className = 'control-group';
                            bcg.style.display = 'grid';
                            bcg.style.gap = '10px';

                            // 折叠头部背景模式 + 分支（none/solid/gradient/glass）
                            (function(){
                              var box = document.createElement('div');
                              var lab = document.createElement('label');
                              lab.textContent = '折叠头部背景模式';
                              box.appendChild(lab);
                              var sel = document.createElement('select');
                              [
                                ['none','无'],
                                ['solid','纯色'],
                                ['gradient','渐变'],
                                ['glass','玻璃（CSS 效果）']
                              ].forEach(function(p){
                                var o = document.createElement('option');
                                o.value = p[0]; o.textContent = p[1];
                                sel.appendChild(o);
                              });
                              sel.value = String(it.rtCollapsedBgMode || 'gradient');
                              sel.addEventListener('change', function(){
                                updateItemById(it.id, { rtCollapsedBgMode: String(sel.value || 'none') });
                                updateVis();
                              });
                              box.appendChild(sel);

                              // 纯色分支
                              var solidGroup = document.createElement('div');
                              solidGroup.className = 'control-group';
                              var sLab = document.createElement('label');
                              sLab.textContent = '折叠头部纯色';
                              solidGroup.appendChild(sLab);
                              var sColor = document.createElement('input');
                              sColor.type = 'color';
                              var defSolid = String((it.rtCollapsedBgColor != null ? it.rtCollapsedBgColor : (State.customization && (State.customization.primaryColor || '#6a717c'))));
                              sColor.value = defSolid;
                              sColor.addEventListener('input', function(){
                                updateItemById(it.id, { rtCollapsedBgColor: String(sColor.value || defSolid) });
                              });
                              solidGroup.appendChild(sColor);

                              // 渐变分支
                              var gradGroup = document.createElement('div');
                              gradGroup.className = 'control-group';
                              var gLab = document.createElement('label');
                              gLab.textContent = '折叠头部渐变';
                              gradGroup.appendChild(gLab);

                              var grid = document.createElement('div');
                              grid.style.display = 'grid';
                              grid.style.gridTemplateColumns = '1fr 1fr';
                              grid.style.gap = '10px';

                              var gStartWrap = document.createElement('div');
                              var gSLab = document.createElement('label');
                              gSLab.textContent = '起色';
                              gStartWrap.appendChild(gSLab);
                              var gStart = document.createElement('input');
                              gStart.type = 'color';
                              gStart.value = String(it.rtCollapsedGradStart || (State.customization && State.customization.primaryColor) || '#6a717c');
                              gStart.addEventListener('input', function(){
                                updateItemById(it.id, { rtCollapsedGradStart: String(gStart.value || '') });
                              });
                              gStartWrap.appendChild(gStart);

                              var gEndWrap = document.createElement('div');
                              var gELab = document.createElement('label');
                              gELab.textContent = '终色';
                              gEndWrap.appendChild(gELab);
                              var gEnd = document.createElement('input');
                              gEnd.type = 'color';
                              gEnd.value = String(it.rtCollapsedGradEnd || (State.customization && State.customization.secondaryColor) || '#97aec8');
                              gEnd.addEventListener('input', function(){
                                updateItemById(it.id, { rtCollapsedGradEnd: String(gEnd.value || '') });
                              });
                              gEndWrap.appendChild(gEnd);

                              grid.appendChild(gStartWrap);
                              grid.appendChild(gEndWrap);

                              var angleRow = document.createElement('div');
                              angleRow.className = 'range-row';
                              var aLab = document.createElement('label');
                              aLab.textContent = '角度(°)';
                              angleRow.appendChild(aLab);
                              var aRange = document.createElement('input');
                              aRange.type = 'range';
                              aRange.min = '0'; aRange.max = '360'; aRange.step = '1';
                              var defAng = isFinite(it.rtCollapsedGradAngle) ? Number(it.rtCollapsedGradAngle) : 135;
                              aRange.value = String(defAng);
                              var aPill = document.createElement('span');
                              aPill.className = 'value-pill';
                              var aVal = document.createElement('span');
                              aVal.textContent = String(defAng);
                              aPill.appendChild(aVal);
                              aPill.appendChild(document.createTextNode('°'));
                              angleRow.appendChild(aRange);
                              angleRow.appendChild(aPill);
                              aRange.addEventListener('input', function(){
                                var v = Math.max(0, Math.min(360, parseInt(aRange.value,10)||135));
                                aVal.textContent = String(v);
                              });
                              aRange.addEventListener('change', function(){
                                var v = Math.max(0, Math.min(360, parseInt(aRange.value,10)||135));
                                updateItemById(it.id, { rtCollapsedGradAngle: v });
                              });

                              gradGroup.appendChild(grid);
                              gradGroup.appendChild(angleRow);

                              function updateVis(){
                                var m = String(sel.value || 'none');
                                solidGroup.style.display = (m === 'solid') ? '' : 'none';
                                gradGroup.style.display  = (m === 'gradient') ? '' : 'none';
                                // glass/none: 均为 CSS/透明效果，无额外输入
                              }
                              updateVis();

                              bcg.appendChild(box);
                              bcg.appendChild(solidGroup);
                              bcg.appendChild(gradGroup);
                            })();

                            // 圆角
                            (function(){
                              var row = document.createElement('div');
                              row.className = 'range-row';
                              var lab = document.createElement('label');
                              lab.textContent = '折叠头部圆角(px)';
                              row.appendChild(lab);
                              var range = document.createElement('input');
                              range.type = 'range';
                              range.min = '0'; range.max = '24'; range.step = '1';
                              var def = isFinite(it.rtCollapsedRadiusPx) ? Number(it.rtCollapsedRadiusPx) : 8;
                              range.value = String(def);
                              var pill = document.createElement('span'); pill.className = 'value-pill';
                              var vv = document.createElement('span'); vv.textContent = String(def);
                              pill.appendChild(vv); pill.appendChild(document.createTextNode('px'));
                              row.appendChild(range); row.appendChild(pill);
                              range.addEventListener('input', function(){ var v=Math.max(0, Math.min(24, parseInt(range.value,10)||0)); vv.textContent=String(v); });
                              range.addEventListener('change', function(){ var v=Math.max(0, Math.min(24, parseInt(range.value,10)||0)); updateItemById(it.id, { rtCollapsedRadiusPx: v }); });
                              bcg.appendChild(row);
                            })();

                            // 边框颜色与厚度
                            (function(){
                              var box = document.createElement('div');
                              var lab = document.createElement('label'); lab.textContent='折叠头部边框';
                              box.appendChild(lab);
                              var grid = document.createElement('div');
                              grid.style.display='grid'; grid.style.gridTemplateColumns='1fr 1fr'; grid.style.gap='10px';

                              var cWrap = document.createElement('div');
                              var cLab = document.createElement('label'); cLab.textContent = '颜色';
                              cWrap.appendChild(cLab);
                              var cInput = document.createElement('input');
                              cInput.type = 'color';
                              var defColor = String((it.rtCollapsedBorderColor != null ? it.rtCollapsedBorderColor : (State.customization && (State.customization.section2LabelColor || State.customization.secondaryColor || '#6a717c'))));
                              cInput.value = defColor;
                              cInput.addEventListener('input', function(){
                                updateItemById(it.id, { rtCollapsedBorderColor: String(cInput.value || defColor) });
                              });
                              cWrap.appendChild(cInput);

                              var tWrap = document.createElement('div');
                              var tLab = document.createElement('label'); tLab.textContent = '厚度(px)';
                              tWrap.appendChild(tLab);
                              var tRange = document.createElement('input');
                              tRange.type='range'; tRange.min='0'; tRange.max='6'; tRange.step='1';
                              var defTh = isFinite(it.rtCollapsedBorderThickness) ? Number(it.rtCollapsedBorderThickness) : 1;
                              tRange.value = String(defTh);
                              var tPill = document.createElement('span'); tPill.className='value-pill';
                              var tVal = document.createElement('span'); tVal.textContent = String(defTh);
                              tPill.appendChild(tVal); tPill.appendChild(document.createTextNode('px'));
                              tRange.addEventListener('input', function(){ var v=Math.max(0, Math.min(6, parseInt(tRange.value,10)||0)); tVal.textContent=String(v); });
                              tRange.addEventListener('change', function(){ var v=Math.max(0, Math.min(6, parseInt(tRange.value,10)||0)); updateItemById(it.id, { rtCollapsedBorderThickness: v }); });
                              tWrap.appendChild(tRange); tWrap.appendChild(tPill);

                              grid.appendChild(cWrap);
                              grid.appendChild(tWrap);
                              box.appendChild(grid);
                              bcg.appendChild(box);
                            })();

                            // 头部上下内边距
                            (function(){
                              var row = document.createElement('div');
                              row.className = 'range-row';
                              var lab = document.createElement('label'); lab.textContent='折叠头部上下内边距(px)';
                              row.appendChild(lab);
                              var range = document.createElement('input');
                              range.type='range'; range.min='0'; range.max='16'; range.step='1';
                              var def = isFinite(it.rtCollapsedPaddingY) ? Number(it.rtCollapsedPaddingY) : 6;
                              range.value = String(def);
                              var pill = document.createElement('span'); pill.className='value-pill';
                              var vv = document.createElement('span'); vv.textContent = String(def);
                              pill.appendChild(vv); pill.appendChild(document.createTextNode('px'));
                              row.appendChild(range); row.appendChild(pill);
                              range.addEventListener('input', function(){ var v=Math.max(0, Math.min(24, parseInt(range.value,10)||0)); vv.textContent=String(v); });
                              range.addEventListener('change', function(){ var v=Math.max(0, Math.min(24, parseInt(range.value,10)||0)); updateItemById(it.id, { rtCollapsedPaddingY: v }); });
                              bcg.appendChild(row);
                            })();

                            // 头部阴影强度
                            (function(){
                              var row = document.createElement('div');
                              row.className = 'range-row';
                              var lab = document.createElement('label'); lab.textContent='折叠头部阴影强度';
                              row.appendChild(lab);
                              var range = document.createElement('input');
                              range.type='range'; range.min='0'; range.max='1'; range.step='0.05';
                              var def = isFinite(it.rtCollapsedShadowStrength) ? Number(it.rtCollapsedShadowStrength) : 0.25;
                              range.value = String(def);
                              var pill = document.createElement('span'); pill.className='value-pill';
                              var vv = document.createElement('span'); vv.textContent = Number(def).toFixed(2);
                              pill.appendChild(vv);
                              row.appendChild(range); row.appendChild(pill);
                              range.addEventListener('input', function(){ var v=Math.max(0, Math.min(1, parseFloat(range.value)||0)); vv.textContent=v.toFixed(2); });
                              range.addEventListener('change', function(){ var v=Math.max(0, Math.min(1, parseFloat(range.value)||0)); updateItemById(it.id, { rtCollapsedShadowStrength: v }); });
                              bcg.appendChild(row);
                            })();

                            // 头部进入与循环动画
                            (function(){
                              var grid = document.createElement('div');
                              grid.style.display='grid'; grid.style.gridTemplateColumns='1fr 1fr'; grid.style.gap='10px';

                              var eCell = document.createElement('div');
                              var eLab = document.createElement('label'); eLab.textContent='头部进入动画';
                              eCell.appendChild(eLab);
                              var eSel = document.createElement('select');
                              [
                                ['none','无'],
                                ['fade','淡入'],
                                ['slide','上移出现'],
                                ['pop','弹入'],
                                ['wipe','擦除'],
                                ['underline','下划线推进'],
                                ['ripple','水波'],
                                ['glitch','赛博故障'],
                                ['flip3d','翻转进入']
                              ].forEach(function(p){
                                var o = document.createElement('option'); o.value=p[0]; o.textContent=p[1]; eSel.appendChild(o);
                              });
                              eSel.value = String(it.rtCollapsedEnterAnim || 'none');
                              eSel.addEventListener('change', function(){
                                updateItemById(it.id, { rtCollapsedEnterAnim: String(eSel.value || 'none') });
                              });
                              eCell.appendChild(eSel);

                              var lCell = document.createElement('div');
                              var lLab = document.createElement('label'); lLab.textContent='头部循环动画';
                              lCell.appendChild(lLab);
                              var lSel = document.createElement('select');
                              [['none','无'],['gloss','光泽'],['shimmer','闪烁'],['breathe','呼吸'],['neon','霓虹']].forEach(function(p){
                                var o = document.createElement('option'); o.value=p[0]; o.textContent=p[1]; lSel.appendChild(o);
                              });
                              lSel.value = String(it.rtCollapsedLoopAnim || 'gloss');
                              lSel.addEventListener('change', function(){
                                updateItemById(it.id, { rtCollapsedLoopAnim: String(lSel.value || 'none') });
                              });
                              lCell.appendChild(lSel);

                              grid.appendChild(eCell);
                              grid.appendChild(lCell);
                              bcg.appendChild(grid);
                            })();

                            // 头部动画 速度/强度
                            (function(){
                              var grid = document.createElement('div');
                              grid.style.display='grid'; grid.style.gridTemplateColumns='1fr 1fr'; grid.style.gap='10px';
                              var spRow = document.createElement('div'); spRow.className='range-row';
                              var spLab = document.createElement('label'); spLab.textContent='头部动画速度(s)';
                              spRow.appendChild(spLab);
                              var spRange = document.createElement('input'); spRange.type='range'; spRange.min='0.4'; spRange.max='3.0'; spRange.step='0.1';
                              var defSp = (typeof it.rtCollapsedAnimSpeed === 'number') ? it.rtCollapsedAnimSpeed : 1.4;
                              spRange.value = String(defSp);
                              var spPill = document.createElement('span'); spPill.className='value-pill';
                              var spVal = document.createElement('span'); spVal.textContent = String(defSp);
                              spPill.appendChild(spVal); spPill.appendChild(document.createTextNode('s'));
                              spRow.appendChild(spRange); spRow.appendChild(spPill);
                              spRange.addEventListener('input', function(){ var v=Math.max(0.2, Math.min(6, parseFloat(spRange.value)||1.4)); spVal.textContent=String(v); });
                              spRange.addEventListener('change', function(){ var v=Math.max(0.2, Math.min(6, parseFloat(spRange.value)||1.4)); updateItemById(it.id, { rtCollapsedAnimSpeed: v }); });

                              var siRow = document.createElement('div'); siRow.className='range-row';
                              var siLab = document.createElement('label'); siLab.textContent='头部动画强度';
                              siRow.appendChild(siLab);
                              var siRange = document.createElement('input'); siRange.type='range'; siRange.min='0'; siRange.max='1'; siRange.step='0.05';
                              var defSi = isFinite(it.rtCollapsedAnimIntensity) ? Number(it.rtCollapsedAnimIntensity) : 0.5;
                              siRange.value = String(defSi);
                              var siPill = document.createElement('span'); siPill.className='value-pill';
                              var siVal = document.createElement('span'); siVal.textContent = Number(defSi).toFixed(2);
                              siPill.appendChild(siVal);
                              siRow.appendChild(siRange); siRow.appendChild(siPill);
                              siRange.addEventListener('input', function(){ var v=Math.max(0, Math.min(1, parseFloat(siRange.value)||0)); siVal.textContent=v.toFixed(2); });
                              siRange.addEventListener('change', function(){ var v=Math.max(0, Math.min(1, parseFloat(siRange.value)||0)); updateItemById(it.id, { rtCollapsedAnimIntensity: v }); });

                              grid.appendChild(spRow);
                              grid.appendChild(siRow);
                              bcg.appendChild(grid);
                            })();

                            // 图标旋转开关
                            // 新增：区域展开动画（头部切换动画）
                            (function(){
                              var box = document.createElement('div');
                              var lab = document.createElement('label');
                              lab.textContent = '区域展开动画';
                              box.appendChild(lab);
                              // 风格选择
                              var sel = document.createElement('select');
                              [
                                ['flip3d','3D翻转'],
                                ['wipe','擦除揭示'],
                                ['pop','弹出回弹'],
                                ['underline','扫线下划'],
                                ['ripple','波纹高光'],
                                ['glitch','故障艺术']
                              ].forEach(function(p){
                                var o = document.createElement('option'); o.value=p[0]; o.textContent=p[1]; sel.appendChild(o);
                              });
                              sel.value = String(it.rtExpandAnimStyle || 'flip3d');
                              sel.addEventListener('change', function(){
                                updateItemById(it.id, { rtExpandAnimStyle: String(sel.value || 'flip3d') });
                              });
                              box.appendChild(sel);

                              // 速度与强度
                              var grid = document.createElement('div');
                              grid.style.display='grid';
                              grid.style.gridTemplateColumns='1fr 1fr';
                              grid.style.gap='10px';

                              // 速度
                              var spRow = document.createElement('div'); spRow.className='range-row';
                              var spLab = document.createElement('label'); spLab.textContent='速度(s)';
                              spRow.appendChild(spLab);
                              var spRange = document.createElement('input'); spRange.type='range'; spRange.min='0.2'; spRange.max='3.0'; spRange.step='0.1';
                              var defSp = (typeof it.rtExpandAnimSpeed === 'number') ? it.rtExpandAnimSpeed : 0.8;
                              spRange.value = String(defSp);
                              var spPill = document.createElement('span'); spPill.className='value-pill';
                              var spVal = document.createElement('span'); spVal.textContent = String(defSp);
                              spPill.appendChild(spVal); spPill.appendChild(document.createTextNode('s'));
                              spRow.appendChild(spRange); spRow.appendChild(spPill);
                              spRange.addEventListener('input', function(){
                                var v = Math.max(0.2, Math.min(6, parseFloat(spRange.value)||0.8));
                                spVal.textContent = String(v);
                              });
                              spRange.addEventListener('change', function(){
                                var v = Math.max(0.2, Math.min(6, parseFloat(spRange.value)||0.8));
                                updateItemById(it.id, { rtExpandAnimSpeed: v });
                              });

                              // 强度
                              var siRow = document.createElement('div'); siRow.className='range-row';
                              var siLab = document.createElement('label'); siLab.textContent='强度';
                              siRow.appendChild(siLab);
                              var siRange = document.createElement('input'); siRange.type='range'; siRange.min='0'; siRange.max='1'; siRange.step='0.05';
                              var defSi = isFinite(it.rtExpandAnimIntensity) ? Number(it.rtExpandAnimIntensity) : 0.6;
                              siRange.value = String(defSi);
                              var siPill = document.createElement('span'); siPill.className='value-pill';
                              var siVal = document.createElement('span'); siVal.textContent = Number(defSi).toFixed(2);
                              siPill.appendChild(siVal);
                              siRow.appendChild(siRange); siRow.appendChild(siPill);
                              siRange.addEventListener('input', function(){
                                var v = Math.max(0, Math.min(1, parseFloat(siRange.value)||0.6));
                                siVal.textContent = v.toFixed(2);
                              });
                              siRange.addEventListener('change', function(){
                                var v = Math.max(0, Math.min(1, parseFloat(siRange.value)||0.6));
                                updateItemById(it.id, { rtExpandAnimIntensity: v });
                              });

                              grid.appendChild(spRow);
                              grid.appendChild(siRow);
                              box.appendChild(grid);
                              bcg.appendChild(box);
                            })();

                            // 原有：折叠/展开时旋转按钮图标
                            (function(){
                              var row = document.createElement('div');
                              row.style.display='flex'; row.style.alignItems='center'; row.style.gap='8px';
                              var cb = document.createElement('input'); cb.type='checkbox'; cb.id = 'rt-icon-rotate-' + it.id;
                              cb.checked = (it.rtIconRotateEnabled !== false);
                              var lb = document.createElement('label'); lb.setAttribute('for', cb.id); lb.textContent='折叠图标平滑旋转';
                              cb.addEventListener('change', function(){ updateItemById(it.id, { rtIconRotateEnabled: !!cb.checked }); });
                              row.appendChild(cb); row.appendChild(lb);
                              bcg.appendChild(row);
                            })();

                            beautifyBox.appendChild(bcg);
                            try{
                              function __ensureCollapsedForPreview(){
                                try{
                                  var lst = getItems ? getItems() : [];
                                  var cur = (Array.isArray(lst) ? lst : []).find(function(x){ return x && x.id === it.id; });
                                  if (cur && !cur.collapsed) {
                                    updateItemById(it.id, { collapsed: true });
                                  }
                                }catch(_eEC){}
                              }
                              beautifyBox.addEventListener('input', __ensureCollapsedForPreview, true);
                              beautifyBox.addEventListener('change', __ensureCollapsedForPreview, true);
                              // 立即确保预览处于折叠态，保证“折叠美化与动画”设置可见且生效
                              try { __ensureCollapsedForPreview(); } catch(_eECI){}
                            }catch(_eBind){}
                            wrap.appendChild(beautifyBox);
 
                            // 新增：区域 · 背景设置（作用于 .st-region-body 展开时的背景/圆角/阴影/内边距/循环特效）
                            (function addRegionBackgroundSettings(){
                              try{
                                var bgBox = document.createElement('div');
                                bgBox.className = 'inline-subbox region-background-box';
                                var bgTitle = document.createElement('div');
                                bgTitle.className = 'form-box-title';
                                bgTitle.textContent = '区域 · 背景设置';
                                bgBox.appendChild(bgTitle);

                                var bgcg = document.createElement('div');
                                bgcg.className = 'control-group';
                                bgcg.style.display = 'grid';
                                bgcg.style.gap = '10px';

                                // 背景模式
                                (function(){
                                  var row = document.createElement('div');
                                  var lab = document.createElement('label');
                                  lab.textContent = '背景模式（区域体）';
                                  row.appendChild(lab);
                                  var sel = document.createElement('select');
                                  [
                                    ['none','无'],
                                    ['solid','纯色'],
                                    ['gradient','渐变'],
                                    ['image','图片'],
                                    ['url','自定义URL']
                                  ].forEach(function(p){
                                    var o = document.createElement('option');
                                    o.value = p[0]; o.textContent = p[1];
                                    sel.appendChild(o);
                                  });
                                  sel.value = String(it.rtRegionBgMode || 'none');
                                  sel.addEventListener('change', function(){
                                    updateItemById(it.id, { rtRegionBgMode: String(sel.value || 'none') });
                                    updateVis();
                                  });
                                  row.appendChild(sel);
                                  bgcg.appendChild(row);

                                  // 纯色
                                  var solidGroup = document.createElement('div');
                                  solidGroup.className = 'control-group';
                                  var sLab = document.createElement('label');
                                  sLab.textContent = '纯色';
                                  solidGroup.appendChild(sLab);
                                  var sColor = document.createElement('input');
                                  sColor.type = 'color';
                                  sColor.value = String(it.rtRegionBgColor || '#111215');
                                  sColor.addEventListener('input', function(){
                                    updateItemById(it.id, { rtRegionBgColor: String(sColor.value || '#111215') });
                                  });
                                  solidGroup.appendChild(sColor);

                                  // 渐变
                                  var gradGroup = document.createElement('div');
                                  gradGroup.className = 'control-group';
                                  var gLab = document.createElement('label');
                                  gLab.textContent = '渐变';
                                  gradGroup.appendChild(gLab);
                                  var grid = document.createElement('div');
                                  grid.style.display = 'grid';
                                  grid.style.gridTemplateColumns = '1fr 1fr';
                                  grid.style.gap = '10px';

                                  var gStartWrap = document.createElement('div');
                                  var gSLab = document.createElement('label');
                                  gSLab.textContent = '起色';
                                  gStartWrap.appendChild(gSLab);
                                  var gStart = document.createElement('input');
                                  gStart.type = 'color';
                                  gStart.value = String(it.rtRegionBgGradStart || (State.customization && State.customization.primaryColor) || '#6a717c');
                                  gStart.addEventListener('input', function(){
                                    updateItemById(it.id, { rtRegionBgGradStart: String(gStart.value || '') });
                                  });
                                  gStartWrap.appendChild(gStart);

                                  var gEndWrap = document.createElement('div');
                                  var gELab = document.createElement('label');
                                  gELab.textContent = '终色';
                                  gEndWrap.appendChild(gELab);
                                  var gEnd = document.createElement('input');
                                  gEnd.type = 'color';
                                  gEnd.value = String(it.rtRegionBgGradEnd || (State.customization && State.customization.secondaryColor) || '#97aec8');
                                  gEnd.addEventListener('input', function(){
                                    updateItemById(it.id, { rtRegionBgGradEnd: String(gEnd.value || '') });
                                  });
                                  gEndWrap.appendChild(gEnd);

                                  grid.appendChild(gStartWrap);
                                  grid.appendChild(gEndWrap);

                                  var angRow = document.createElement('div');
                                  angRow.className = 'range-row';
                                  var aLab = document.createElement('label');
                                  aLab.textContent = '角度(°)';
                                  angRow.appendChild(aLab);
                                  var aRange = document.createElement('input');
                                  aRange.type = 'range';
                                  aRange.min = '0'; aRange.max = '360'; aRange.step = '1';
                                  var defAng = isFinite(it.rtRegionBgGradAngle) ? Number(it.rtRegionBgGradAngle) : 135;
                                  aRange.value = String(defAng);
                                  var aPill = document.createElement('span');
                                  aPill.className = 'value-pill';
                                  var aVal = document.createElement('span');
                                  aVal.textContent = String(defAng);
                                  aPill.appendChild(aVal);
                                  aPill.appendChild(document.createTextNode('°'));
                                  angRow.appendChild(aRange);
                                  angRow.appendChild(aPill);
                                  aRange.addEventListener('input', function(){
                                    var v = Math.max(0, Math.min(360, parseInt(aRange.value,10)||135));
                                    aVal.textContent = String(v);
                                  });
                                  aRange.addEventListener('change', function(){
                                    var v = Math.max(0, Math.min(360, parseInt(aRange.value,10)||135));
                                    updateItemById(it.id, { rtRegionBgGradAngle: v });
                                  });

                                  gradGroup.appendChild(grid);
                                  gradGroup.appendChild(angRow);

                                  // 图片/URL
                                  var imgGroup = document.createElement('div');
                                  imgGroup.className = 'control-group';
                                  var imgLab = document.createElement('label');
                                  imgLab.textContent = '背景图片 URL';
                                  imgGroup.appendChild(imgLab);
                                  var imgInput = document.createElement('input');
                                  imgInput.type = 'url';
                                  imgInput.placeholder = 'https://example.com/region-bg.jpg';
                                  imgInput.value = String(it.rtRegionBgImageUrl || '');
                                  imgInput.addEventListener('change', function(){
                                    updateItemById(it.id, { rtRegionBgImageUrl: String(imgInput.value || '') });
                                  });
                                  imgGroup.appendChild(imgInput);

                                  var urlGroup = document.createElement('div');
                                  urlGroup.className = 'control-group';
                                  var urlLab = document.createElement('label');
                                  urlLab.textContent = '自定义 URL 背景';
                                  urlGroup.appendChild(urlLab);
                                  var urlInput = document.createElement('input');
                                  urlInput.type = 'url';
                                  urlInput.placeholder = 'https://example.com/your-image.png';
                                  urlInput.value = String((it.rtRegionBgUrl != null ? it.rtRegionBgUrl : '') || '');
                                  urlInput.addEventListener('change', function(){
                                    updateItemById(it.id, { rtRegionBgUrl: String(urlInput.value || '') });
                                  });
                                  urlGroup.appendChild(urlInput);

                                  function updateVis(){
                                    var m = String(sel.value || 'none');
                                    solidGroup.style.display = (m === 'solid') ? '' : 'none';
                                    gradGroup.style.display  = (m === 'gradient') ? '' : 'none';
                                    imgGroup.style.display   = (m === 'image') ? '' : 'none';
                                    urlGroup.style.display   = (m === 'url') ? '' : 'none';
                                  }
                                  updateVis();

                                  bgcg.appendChild(solidGroup);
                                  bgcg.appendChild(gradGroup);
                                  bgcg.appendChild(imgGroup);
                                  bgcg.appendChild(urlGroup);
                                })();

                                // 圆角（区域体）
                                (function(){
                                  var row = document.createElement('div');
                                  row.className = 'range-row';
                                  var lab = document.createElement('label');
                                  lab.textContent = '区域体圆角(px)';
                                  row.appendChild(lab);
                                  var range = document.createElement('input');
                                  range.type = 'range'; range.min='0'; range.max='24'; range.step='1';
                                  var def = isFinite(it.rtRegionBodyRadiusPx) ? Number(it.rtRegionBodyRadiusPx) : 8;
                                  range.value = String(def);
                                  var pill = document.createElement('span'); pill.className='value-pill';
                                  var vv = document.createElement('span'); vv.textContent = String(def);
                                  pill.appendChild(vv); pill.appendChild(document.createTextNode('px'));
                                  row.appendChild(range); row.appendChild(pill);
                                  range.addEventListener('input', function(){
                                    var v = Math.max(0, Math.min(32, parseInt(range.value,10)||0));
                                    vv.textContent = String(v);
                                  });
                                  range.addEventListener('change', function(){
                                    var v = Math.max(0, Math.min(32, parseInt(range.value,10)||0));
                                    updateItemById(it.id, { rtRegionBodyRadiusPx: v });
                                  });
                                  bgcg.appendChild(row);
                                })();

                                // 上下内边距
                                (function(){
                                  var row = document.createElement('div');
                                  row.className = 'range-row';
                                  var lab = document.createElement('label'); lab.textContent='区域体上下内边距(px)';
                                  row.appendChild(lab);
                                  var range = document.createElement('input');
                                  range.type='range'; range.min='0'; range.max='24'; range.step='1';
                                  var def = isFinite(it.rtRegionBodyPaddingY) ? Number(it.rtRegionBodyPaddingY) : 8;
                                  range.value = String(def);
                                  var pill = document.createElement('span'); pill.className='value-pill';
                                  var vv = document.createElement('span'); vv.textContent = String(def);
                                  pill.appendChild(vv); pill.appendChild(document.createTextNode('px'));
                                  row.appendChild(range); row.appendChild(pill);
                                  range.addEventListener('input', function(){
                                    var v = Math.max(0, Math.min(32, parseInt(range.value,10)||0));
                                    vv.textContent = String(v);
                                  });
                                  range.addEventListener('change', function(){
                                    var v = Math.max(0, Math.min(32, parseInt(range.value,10)||0));
                                    updateItemById(it.id, { rtRegionBodyPaddingY: v });
                                  });
                                  bgcg.appendChild(row);
                                })();

                                // 阴影强度（区域体）
                                (function(){
                                  var row = document.createElement('div');
                                  row.className = 'range-row';
                                  var lab = document.createElement('label'); lab.textContent='区域体阴影强度';
                                  row.appendChild(lab);
                                  var range = document.createElement('input');
                                  range.type='range'; range.min='0'; range.max='1'; range.step='0.05';
                                  var def = isFinite(it.rtRegionBodyShadowStrength) ? Number(it.rtRegionBodyShadowStrength) : 0;
                                  range.value = String(def);
                                  var pill = document.createElement('span'); pill.className='value-pill';
                                  var vv = document.createElement('span'); vv.textContent = Number(def).toFixed(2);
                                  pill.appendChild(vv);
                                  row.appendChild(range); row.appendChild(pill);
                                  range.addEventListener('input', function(){
                                    var v = Math.max(0, Math.min(1, parseFloat(range.value)||0));
                                    vv.textContent = v.toFixed(2);
                                  });
                                  range.addEventListener('change', function(){
                                    var v = Math.max(0, Math.min(1, parseFloat(range.value)||0));
                                    updateItemById(it.id, { rtRegionBodyShadowStrength: v });
                                  });
                                  bgcg.appendChild(row);
                                })();

                                // 区域体循环特效（可选：光泽/闪烁/呼吸/霓虹）
                                (function(){
                                  var row = document.createElement('div');
                                  var lab = document.createElement('label'); lab.textContent = '区域体循环特效';
                                  row.appendChild(lab);
                                  var sel = document.createElement('select');
                                  [
                                    ['none','无'],
                                    ['gloss','光泽'],
                                    ['shimmer','闪烁'],
                                    ['breathe','呼吸'],
                                    ['neon','霓虹']
                                  ].forEach(function(p){
                                    var o = document.createElement('option');
                                    o.value = p[0]; o.textContent = p[1];
                                    sel.appendChild(o);
                                  });
                                  sel.value = String(it.rtRegionBodyLoopAnim || 'none');
                                  sel.addEventListener('change', function(){
                                    updateItemById(it.id, { rtRegionBodyLoopAnim: String(sel.value || 'none') });
                                  });
                                  row.appendChild(sel);
                                  bgcg.appendChild(row);
                                })();

                                bgBox.appendChild(bgcg);
                                wrap.appendChild(bgBox);
                                try { console.log('[ItemsEditor] RegionBackground mounted', it && it.id); } catch(_eLog){}
                              } catch(_eBgBox){}
                            })();

                            // 子框：区域 · 动作动画（主体）（作用于 .st-region-body 展开/折叠）
                            var motionBox = document.createElement('div');
                            motionBox.className = 'inline-subbox region-motion-box';
                            var mTitle = document.createElement('div');
                            mTitle.className = 'form-box-title';
                            mTitle.textContent = '区域 · 动作动画（主体）';
                            motionBox.appendChild(mTitle);
                            // 使“区域 · 动作动画（主体）”子框可折叠（与其他子框一致）
                            try{
                              motionBox.classList.add('collapsible');
                              mTitle.setAttribute('tabindex','0');
                              mTitle.addEventListener('click', function(){ motionBox.classList.toggle('collapsed'); });
                              mTitle.addEventListener('keydown', function(e){
                                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); motionBox.classList.toggle('collapsed'); }
                              });
                            }catch(_eMotionC){}

                            var mcg = document.createElement('div');
                            mcg.className = 'control-group';
                            mcg.style.display = 'grid';
                            mcg.style.gap = '10px';

                            // enter / exit 组合
                            (function(){
                              var grid = document.createElement('div');
                              grid.style.display='grid'; grid.style.gridTemplateColumns='1fr 1fr'; grid.style.gap='10px';
                              function makeComboCell(label, key, def){
                                var cell = document.createElement('div');
                                var lb = document.createElement('label'); lb.textContent = label;
                                cell.appendChild(lb);
                                var sel = document.createElement('select');
                                ['none','fade','slide-down','slide-up','zoom-in','zoom-out','slide-down+fade','slide-up+fade','zoom-in+fade','zoom-out+fade'].forEach(function(v){
                                  var o = document.createElement('option'); o.value = v; o.textContent = v; sel.appendChild(o);
                                });
                                sel.value = String(it[key] || def);
                                sel.addEventListener('change', function(){
                                  var patch = {}; patch[key] = String(sel.value || def);
                                  updateItemById(it.id, patch);
                                });
                                cell.appendChild(sel); return cell;
                              }
                              grid.appendChild(makeComboCell('展开 enter', 'rtRegionEnterCombo', 'slide-down+fade'));
                              grid.appendChild(makeComboCell('折叠 exit', 'rtRegionExitCombo', 'slide-up+fade'));
                              mcg.appendChild(grid);
                            })();

                            // 时长与强度
                            (function(){
                              var grid = document.createElement('div');
                              grid.style.display='grid'; grid.style.gridTemplateColumns='1fr 1fr'; grid.style.gap='10px';

                              var dRow = document.createElement('div'); dRow.className='range-row';
                              var dLab = document.createElement('label'); dLab.textContent='动作时长(s)';
                              dRow.appendChild(dLab);
                              var dRange = document.createElement('input'); dRange.type='range'; dRange.min='0.2'; dRange.max='3.0'; dRange.step='0.1';
                              var defDur = (typeof it.rtRegionAnimDuration === 'number') ? it.rtRegionAnimDuration : 0.6;
                              dRange.value = String(defDur);
                              var dPill = document.createElement('span'); dPill.className='value-pill';
                              var dVal = document.createElement('span'); dVal.textContent = String(defDur);
                              dPill.appendChild(dVal); dPill.appendChild(document.createTextNode('s'));
                              dRow.appendChild(dRange); dRow.appendChild(dPill);
                              dRange.addEventListener('input', function(){ var v=Math.max(0.1, Math.min(6, parseFloat(dRange.value)||0.6)); dVal.textContent=String(v); });
                              dRange.addEventListener('change', function(){ var v=Math.max(0.1, Math.min(6, parseFloat(dRange.value)||0.6)); updateItemById(it.id, { rtRegionAnimDuration: v }); });

                              var iRow = document.createElement('div'); iRow.className='range-row';
                              var iLab = document.createElement('label'); iLab.textContent='动作强度';
                              iRow.appendChild(iLab);
                              var iRange = document.createElement('input'); iRange.type='range'; iRange.min='0'; iRange.max='1'; iRange.step='0.05';
                              var defInt = isFinite(it.rtRegionAnimIntensity) ? Number(it.rtRegionAnimIntensity) : 0.5;
                              iRange.value = String(defInt);
                              var iPill = document.createElement('span'); iPill.className='value-pill';
                              var iVal = document.createElement('span'); iVal.textContent = Number(defInt).toFixed(2);
                              iPill.appendChild(iVal);
                              iRow.appendChild(iRange); iRow.appendChild(iPill);
                              iRange.addEventListener('input', function(){ var v=Math.max(0, Math.min(1, parseFloat(iRange.value)||0)); iVal.textContent=v.toFixed(2); });
                              iRange.addEventListener('change', function(){ var v=Math.max(0, Math.min(1, parseFloat(iRange.value)||0)); updateItemById(it.id, { rtRegionAnimIntensity: v }); });

                              grid.appendChild(dRow);
                              grid.appendChild(iRow);
                              mcg.appendChild(grid);
                            })();

                            // 缓动函数
                            (function(){
                              var cell = document.createElement('div');
                              var lab = document.createElement('label'); lab.textContent='动画缓动';
                              cell.appendChild(lab);
                              var sel = document.createElement('select');
                              [['ease','ease'],['ease-out','ease-out'],['linear','linear'],['cubic-bezier(.22,.61,.36,1)','cubic-bezier(.22,.61,.36,1)']].forEach(function(p){
                                var o = document.createElement('option'); o.value = p[0]; o.textContent = p[1]; sel.appendChild(o);
                              });
                              sel.value = String(it.rtRegionAnimEasing || 'cubic-bezier(.22,.61,.36,1)');
                              sel.addEventListener('change', function(){
                                updateItemById(it.id, { rtRegionAnimEasing: String(sel.value || 'ease') });
                              });
                              cell.appendChild(sel);
                              mcg.appendChild(cell);
                            })();

                            motionBox.appendChild(mcg);
                            wrap.appendChild(motionBox);
                          } catch(_eRegionUI){}
                        })();

                      } catch(_eFoldSettings){}
                    })();

                    // 新增：区域 · 添加子项目（紧随“区域标题 · 样式”之后，内置于本区域盒内）
                    (function addRegionChildAdderInline(){
                      try{
                        // UI 容器（作为 box 内的子块，保持紧邻与视觉归属）
                        var addBox = document.createElement('div');
                        addBox.className = 'inline-subbox';
                        addBox.setAttribute('data-role','region-child-adder');
                        var titleBox2 = document.createElement('div');
                        titleBox2.className = 'form-box-title';
                        titleBox2.textContent = '区域 · 添加子项目';
                        addBox.appendChild(titleBox2);

                        var cg = document.createElement('div');
                        cg.className = 'control-group';
                        cg.style.display = 'flex';
                        cg.style.gap = '10px';
                        cg.style.alignItems = 'center';

                        // 选择类型
                        var selAdd = document.createElement('select');
                        [
                          {v:'text', t:'文本'},
                          {v:'longtext', t:'长文字'},
                          {v:'bar', t:'进度条/数值条'}
                        ].forEach(function(opt){
                          var o = document.createElement('option');
                          o.value = opt.v; o.textContent = opt.t;
                          selAdd.appendChild(o);
                        });
                        selAdd.value = 'text';

                        // 添加按钮
                        var btnAdd = document.createElement('button');
                        btnAdd.className = 'btn btn-primary';
                        btnAdd.style.width = 'auto';
                        btnAdd.style.flexShrink = '0';
                        btnAdd.textContent = '添加到区域';

                        btnAdd.addEventListener('click', function(){
                          try{
                            var list = getItems();
                            var rid = it.id;
                            var rIdx = -1;
                            for (var i = 0; i < list.length; i++){
                              var ii = list[i];
                              if (ii && ii.id === rid){ rIdx = i; break; }
                            }
                            if (rIdx < 0) return;

                            // 计算插入点：当前区域之后，直到下一个区域或列表末尾
                            var end = rIdx + 1;
                            while (end < list.length && list[end] && list[end].type !== 'region') { end++; }

                            var type = String(selAdd.value || 'text').toLowerCase();
                            var newItem;

                            if (type === 'longtext') {
                              var defLh = (State.customization && typeof State.customization.longTextLineHeight === 'number') ? State.customization.longTextLineHeight : 1.6;
                              newItem = {
                                id: newId(),
                                type: 'longtext',
                                parentRegionId: rid,
                                label: '说明',
                                value: '',
                                ltLineHeight: defLh,
                                ltEffect: 'none',
                                ltSkipFirstLine: false,
                                ltFirstIndentPx: 0,
                                ltPadTopPx: 0,
                                ltPadRightPx: 0,
                                ltPadBottomPx: 0,
                                ltPadLeftPx: 0,
                                ltTwSpeedMs: 18,
                                ltTwDelayMs: 0,
                                ltTwCaret: true
                              };
                            } else if (type === 'bar') {
                              newItem = { id: newId(), type: 'bar', parentRegionId: rid, label: '进度', percent: 50 };
                            } else {
                              newItem = { id: newId(), type: 'text', parentRegionId: rid, label: '标签', value: '' };
                            }

                            // 插入并刷新
                            list.splice(end, 0, newItem);
                            setItems(list);
                            renderItemsEditor();
                          } catch(_eAddRegion){}
                        });

                        cg.appendChild(selAdd);
                        cg.appendChild(btnAdd);
                        addBox.appendChild(cg);

                        // 将子项目添加器作为同级子框附加到当前项，位于“折叠设置”之后
                        wrap.appendChild(addBox);
                      } catch(_eAdderInline){}
                    })();

                    /* 已在上方挂载“区域标题 · 样式”盒到当前项，避免重复 append 导致顺序错乱 */

                    // 区域 · 子项目容器（仅供“从区域添加”产生的子项目显示，编号如 X.n）
                    var subBox = document.createElement('div');
                    subBox.className = 'inline-subbox region-children-box';
                    var subTitle = document.createElement('div');
                    subTitle.className = 'form-box-title';
                    subTitle.textContent = '子项目';
                    subBox.appendChild(subTitle);
                    var childContainer = document.createElement('div');
                    childContainer.className = 'region-children';
                    if (it.collapsed) { subBox.style.display = 'none'; }
                    subBox.appendChild(childContainer);
                    wrap.appendChild(subBox);
                    // 记录容器以便后续子项目挂载
                    regionChildrenContainers[it.id] = childContainer;
                    // 如存在该区域的待挂载子项目，批量附加并清空待挂载池
                    try{
                      var pend = pendingChildrenByRegionId[it.id];
                      if (Array.isArray(pend) && pend.length){
                        pend.forEach(function(node){ try{ childContainer.appendChild(node); }catch(_eAppend){} });
                        pendingChildrenByRegionId[it.id] = [];
                      }
                    }catch(_ePend){}
                  } catch(_eRegion){}
                })();

 
                // 每项的“卡片背景与阴影（本项）”设置（当已开启“每项独立设置”时显示）
                (function addCardBgShadowPerItemUI(){
                  try{
                    var c = (State && State.customization) ? State.customization : {};
                    // 区域为分组容器，不渲染卡片背景与阴影块
                    if (it && it.type === 'region') { return; }
                    if (!c.itemCardPerItemEnabled) {
                      // 未开启时不渲染该块
                      return;
                    }
                    // 容器
                    var box = document.createElement('div');
                    box.className = 'inline-subbox';
                    var titleBox = document.createElement('div');
                    titleBox.className = 'form-box-title';
                    titleBox.textContent = '卡片背景与阴影（本项）';
                    box.appendChild(titleBox);

                    // 行：模式选择
                    var rowMode = document.createElement('div');
                    rowMode.className = 'control-group';
                    var labMode = document.createElement('label');
                    labMode.textContent = '背景模式（本项）';
                    rowMode.appendChild(labMode);
                    var modeSel = document.createElement('select');
                    [
                      {v:'inherit', t:'跟随全局'},
                      {v:'theme', t:'模板'},
                      {v:'none', t:'无背景（透明）'},
                      {v:'color', t:'纯色'},
                      {v:'gradient', t:'渐变'},
                      {v:'image', t:'图片'},
                      {v:'url', t:'自定义URL背景'}
                    ].forEach(function(opt){
                      var o = document.createElement('option');
                      o.value = opt.v; o.textContent = opt.t;
                      modeSel.appendChild(o);
                    });
                    modeSel.value = String(it.cardBgMode || 'inherit');
                    rowMode.appendChild(modeSel);
                    box.appendChild(rowMode);

                    // 纯色组
                    var rowColor = document.createElement('div');
                    rowColor.className = 'control-group';
                    rowColor.style.display = 'none';
                    var labColor = document.createElement('label');
                    labColor.textContent = '纯色背景（本项）';
                    rowColor.appendChild(labColor);
                    var colorInput = document.createElement('input');
                    colorInput.type = 'color';
                    colorInput.value = String(it.cardBgColor || c.itemCardBgColor || '#111215');
                    rowColor.appendChild(colorInput);
                    var colorCode = document.createElement('input');
                    colorCode.type = 'text';
                    colorCode.placeholder = '#RRGGBB 或 CSS颜色';
                    colorCode.style.marginTop = '6px';
                    colorCode.value = String(it.cardBgColor || c.itemCardBgColor || '#111215');
                    rowColor.appendChild(colorCode);
                    box.appendChild(rowColor);

                    // 渐变组
                    var rowGrad = document.createElement('div');
                    rowGrad.className = 'control-group';
                    rowGrad.style.display = 'none';
                    var labGrad = document.createElement('label');
                    labGrad.textContent = '渐变背景（本项）';
                    rowGrad.appendChild(labGrad);
                    var gradGrid = document.createElement('div');
                    gradGrid.style.display = 'grid';
                    gradGrid.style.gridTemplateColumns = '1fr 1fr';
                    gradGrid.style.gap = '10px';
                    // 起色
                    var gStartWrap = document.createElement('div');
                    var gStartLab = document.createElement('label');
                    gStartLab.textContent = '起色';
                    gStartWrap.appendChild(gStartLab);
                    var gStartInput = document.createElement('input');
                    gStartInput.type = 'color';
                    gStartInput.value = String(it.cardGradStart || c.itemCardGradStart || c.primaryColor || '#6a717c');
                    gStartWrap.appendChild(gStartInput);
                    var gStartCode = document.createElement('input');
                    gStartCode.type = 'text';
                    gStartCode.placeholder = '#RRGGBB 或 CSS颜色';
                    gStartCode.style.marginTop = '6px';
                    gStartCode.value = String(it.cardGradStart || c.itemCardGradStart || c.primaryColor || '#6a717c');
                    gStartWrap.appendChild(gStartCode);
                    // 终色
                    var gEndWrap = document.createElement('div');
                    var gEndLab = document.createElement('label');
                    gEndLab.textContent = '终色';
                    gEndWrap.appendChild(gEndLab);
                    var gEndInput = document.createElement('input');
                    gEndInput.type = 'color';
                    gEndInput.value = String(it.cardGradEnd || c.itemCardGradEnd || c.secondaryColor || '#97aec8');
                    gEndWrap.appendChild(gEndInput);
                    var gEndCode = document.createElement('input');
                    gEndCode.type = 'text';
                    gEndCode.placeholder = '#RRGGBB 或 CSS颜色';
                    gEndCode.style.marginTop = '6px';
                    gEndCode.value = String(it.cardGradEnd || c.itemCardGradEnd || c.secondaryColor || '#97aec8');
                    gEndWrap.appendChild(gEndCode);
                    gradGrid.appendChild(gStartWrap);
                    gradGrid.appendChild(gEndWrap);
                    rowGrad.appendChild(gradGrid);
                    // 角度
                    var angleRow = document.createElement('div');
                    angleRow.className = 'range-row';
                    var angleLab = document.createElement('label');
                    angleLab.textContent = '角度(°)';
                    angleRow.appendChild(angleLab);
                    var angleRange = document.createElement('input');
                    angleRange.type = 'range';
                    angleRange.min = '0';
                    angleRange.max = '360';
                    angleRange.step = '1';
                    angleRange.value = String(isFinite(it.cardGradAngle) ? Number(it.cardGradAngle) : (isFinite(c.itemCardGradAngle) ? Number(c.itemCardGradAngle) : 135));
                    angleRow.appendChild(angleRange);
                    var anglePill = document.createElement('span');
                    anglePill.className = 'value-pill';
                    var angleVal = document.createElement('span');
                    angleVal.textContent = String(angleRange.value);
                    anglePill.appendChild(angleVal);
                    anglePill.appendChild(document.createTextNode('°'));
                    angleRow.appendChild(anglePill);
                    rowGrad.appendChild(angleRow);
                    box.appendChild(rowGrad);

                    // 图片组
                    var rowImage = document.createElement('div');
                    rowImage.className = 'control-group';
                    rowImage.style.display = 'none';
                    var imgLab = document.createElement('label');
                    imgLab.textContent = '背景图片 URL（本项）';
                    rowImage.appendChild(imgLab);
                    var imgInput = document.createElement('input');
                    imgInput.type = 'url';
                    imgInput.placeholder = 'https://example.com/card-bg.jpg';
                    imgInput.value = String(it.cardBgImageUrl || '');
                    rowImage.appendChild(imgInput);
                    box.appendChild(rowImage);

                    // URL 组
                    var rowUrl = document.createElement('div');
                    rowUrl.className = 'control-group';
                    rowUrl.style.display = 'none';
                    var urlLab = document.createElement('label');
                    urlLab.textContent = '自定义 URL 背景（本项）';
                    rowUrl.appendChild(urlLab);
                    var urlInput = document.createElement('input');
                    urlInput.type = 'url';
                    urlInput.placeholder = 'https://example.com/your-image.png';
                    urlInput.value = String((it.cardBgUrl != null ? it.cardBgUrl : it.cardUrl) || '');
                    rowUrl.appendChild(urlInput);
                    box.appendChild(rowUrl);

                    // 阴影组
                    var rowShadow = document.createElement('div');
                    rowShadow.className = 'control-group';
                    var shLabWrap = document.createElement('label');
                    shLabWrap.style.display = 'flex';
                    shLabWrap.style.alignItems = 'center';
                    shLabWrap.style.gap = '8px';
                    var shCb = document.createElement('input');
                    shCb.type = 'checkbox';
                    shCb.checked = (it.cardShadowEnable != null) ? !!it.cardShadowEnable : !!c.itemCardShadowEnabled;
                    shLabWrap.appendChild(shCb);
                    shLabWrap.appendChild(document.createTextNode('启用阴影（本项）'));
                    rowShadow.appendChild(shLabWrap);
                    var shRangeRow = document.createElement('div');
                    shRangeRow.className = 'range-row';
                    shRangeRow.style.marginTop = '6px';
                    var shRLab = document.createElement('label');
                    shRLab.textContent = '强度';
                    shRangeRow.appendChild(shRLab);
                    var shRange = document.createElement('input');
                    shRange.type = 'range';
                    shRange.min = '0';
                    shRange.max = '1';
                    shRange.step = '0.05';
                    shRange.value = String(isFinite(it.cardShadowStrength) ? Number(it.cardShadowStrength) : (isFinite(c.itemCardShadowStrength) ? Number(c.itemCardShadowStrength) : 0.30));
                    shRange.disabled = !shCb.checked;
                    shRangeRow.appendChild(shRange);
                    var shPill = document.createElement('span');
                    shPill.className = 'value-pill';
                    var shVal = document.createElement('span');
                    shVal.textContent = Number(shRange.value).toFixed(2);
                    shPill.appendChild(shVal);
                    rowShadow.appendChild(shRangeRow);
                    var shSpacer = document.createElement('span'); // 为了匹配结构，附加显示 value-pill
                    shRangeRow.appendChild(shPill);
                    box.appendChild(rowShadow);

                    // 显隐联动
                    function updateVis(){
                      var m = String(modeSel.value || 'inherit');
                      rowColor.style.display = (m === 'color') ? '' : 'none';
                      rowGrad.style.display = (m === 'gradient') ? '' : 'none';
                      rowImage.style.display = (m === 'image') ? '' : 'none';
                      rowUrl.style.display = (m === 'url') ? '' : 'none';
                    }
                    updateVis();

                    // 事件绑定
                    modeSel.addEventListener('change', function(){
                      var v = String(modeSel.value || 'inherit');
                      updateItemById(it.id, { cardBgMode: v });
                      updateVis();
                    });

                    // 纯色
                    function syncColor(val){
                      colorInput.value = val;
                      colorCode.value = val;
                    }
                    colorInput.addEventListener('input', function(){
                      var v = String(colorInput.value || '').trim();
                      syncColor(v);
                      updateItemById(it.id, { cardBgColor: v });
                    });
                    colorCode.addEventListener('change', function(){
                      var v = String(colorCode.value || '').trim();
                      syncColor(v);
                      updateItemById(it.id, { cardBgColor: v });
                    });

                    // 渐变
                    function syncGStart(v){ gStartInput.value = v; gStartCode.value = v; }
                    function syncGEnd(v){ gEndInput.value = v; gEndCode.value = v; }
                    gStartInput.addEventListener('input', function(){
                      var v = String(gStartInput.value || '').trim();
                      syncGStart(v);
                      updateItemById(it.id, { cardGradStart: v });
                    });
                    gStartCode.addEventListener('change', function(){
                      var v = String(gStartCode.value || '').trim();
                      syncGStart(v);
                      updateItemById(it.id, { cardGradStart: v });
                    });
                    gEndInput.addEventListener('input', function(){
                      var v = String(gEndInput.value || '').trim();
                      syncGEnd(v);
                      updateItemById(it.id, { cardGradEnd: v });
                    });
                    gEndCode.addEventListener('change', function(){
                      var v = String(gEndCode.value || '').trim();
                      syncGEnd(v);
                      updateItemById(it.id, { cardGradEnd: v });
                    });
                    angleRange.addEventListener('input', function(){
                      var v = parseInt(angleRange.value, 10) || 0;
                      angleVal.textContent = String(v);
                    });
                    angleRange.addEventListener('change', function(){
                      var v = parseInt(angleRange.value, 10) || 0;
                      updateItemById(it.id, { cardGradAngle: v });
                    });

                    // 图片
                    imgInput.addEventListener('change', function(){
                      var v = String(imgInput.value || '').trim();
                      updateItemById(it.id, { cardBgImageUrl: v });
                    });

                    // URL
                    urlInput.addEventListener('change', function(){
                      var v = String(urlInput.value || '').trim();
                      updateItemById(it.id, { cardBgUrl: v });
                    });

                    // 阴影
                    shCb.addEventListener('change', function(){
                      var on = !!shCb.checked;
                      shRange.disabled = !on;
                      updateItemById(it.id, { cardShadowEnable: on });
                    });
                    shRange.addEventListener('input', function(){
                      var v = Math.max(0, Math.min(1, parseFloat(shRange.value) || 0));
                      shVal.textContent = v.toFixed(2);
                    });
                    shRange.addEventListener('change', function(){
                      var v = Math.max(0, Math.min(1, parseFloat(shRange.value) || 0));
                      updateItemById(it.id, { cardShadowStrength: v });
                    });

                    // 附加到当前项容器
                    wrap.appendChild(box);
                  } catch(_eCard){}
                })();

                // 其它类型：仅显示标题与删除按钮（不变更现有行为）
                var parentEl = cont;
                if (it && it.type !== 'region' && it.parentRegionId) {
                  if (regionChildrenContainers[it.parentRegionId]) {
                    parentEl = regionChildrenContainers[it.parentRegionId];
                    parentEl.appendChild(wrap);
                  } else {
                    // 区域容器尚未创建，暂存待挂载
                    if (!pendingChildrenByRegionId[it.parentRegionId]) pendingChildrenByRegionId[it.parentRegionId] = [];
                    pendingChildrenByRegionId[it.parentRegionId].push(wrap);
                  }
                } else {
                  parentEl.appendChild(wrap);
                }
              });
            }

            // 添加新项目
            (function bindAddItem(){
              try {
                var sel = body.querySelector('#add-item-select');
                var btn = sel ? sel.parentElement && sel.parentElement.querySelector('button.btn-primary') : null;
                if (btn && !btn.__nyBound) {
                  btn.__nyBound = true;
                  btn.addEventListener('click', function(){
                    try {
                      var type = String(sel && sel.value || 'text').toLowerCase();
                      var items = getItems();
                      if (type === 'longtext') {
                        var defLh = (State.customization && typeof State.customization.longTextLineHeight === 'number') ? State.customization.longTextLineHeight : 1.6;
                        items.push({
                          id: newId(),
                          type: 'longtext',
                          label: '说明',
                          value: '',
                          ltLineHeight: defLh,
                          ltEffect: 'none',
                          ltSkipFirstLine: false,
                          ltFirstIndentPx: 0,
                          ltPadTopPx: 0,
                          ltPadRightPx: 0,
                          ltPadBottomPx: 0,
                          ltPadLeftPx: 0,
                          ltTwSpeedMs: 18,
                          ltTwDelayMs: 0,
                          ltTwCaret: true
                        });
                      } else if (type === 'text') {
                        items.push({ id: newId(), type: 'text', label: '标签', value: '' });
                      } else if (type === 'bar') {
                        items.push({ id: newId(), type: 'bar', label: '进度', percent: 50 });
                      } else if (type === 'region') {
                        var defLblSize = (State.customization && isFinite(State.customization.globalLabelFontSize)) ? Number(State.customization.globalLabelFontSize) : 16;
                        var defLblWeight = (State.customization && isFinite(State.customization.globalLabelWeight)) ? Number(State.customization.globalLabelWeight) : 500;
                        var defULColor = (State.customization && (State.customization.section2LabelColor || State.customization.secondaryColor)) || '#6a717c';
                        items.push({
                            id: newId(),
                            type: 'region',
                            label: '区域',
                            collapsed: false,
                            rtHeaderMarginTopPx: 6,
                            rtHeaderMarginBottomPx: 6,
                            rtAlign: 'left',
                            rtFontSize: defLblSize,
                            rtWeight: defLblWeight,
                            rtItalic: false,
                            rtUppercase: false,
                            rtUnderlineStyle: 'none',
                            rtUnderlineColor: defULColor,
                            rtUnderlineThickness: 2,
                            rtUnderlineOffset: 4,
                            rtColorMode: 'theme',
                            rtColorSolid: '',
                            rtGradStart: '',
                            rtGradEnd: '',
                            rtGradAngle: 0,
                            // 折叠设置默认值
                            rtExportCollapsed: false,
                            rtToggleMode: 'header',
                            rtToggleIconStyle: 'triangle',
                            rtToggleIconExp: '▾',
                            rtToggleIconCol: '▶',
                            // 折叠美化默认值（头部）
                            rtCollapsedBgMode: 'gradient',
                            rtCollapsedBgColor: '',
                            rtCollapsedGradStart: '',
                            rtCollapsedGradEnd: '',
                            rtCollapsedGradAngle: 135,
                            rtCollapsedRadiusPx: 8,
                            rtCollapsedBorderColor: defULColor,
                            rtCollapsedBorderThickness: 1,
                            rtCollapsedPaddingY: 6,
                            rtCollapsedShadowStrength: 0.25,
                            rtCollapsedEnterAnim: 'none',
                            rtCollapsedLoopAnim: 'none',
                            rtCollapsedAnimSpeed: 1.4,
                            rtCollapsedAnimIntensity: 0.5,
                            rtIconRotateEnabled: true,
                            // 新增：区域展开动画（头部切换）
                            rtExpandAnimStyle: 'flip3d',
                            rtExpandAnimSpeed: 0.8,
                            rtExpandAnimIntensity: 0.6,
                            // 区域体 背景默认值
                            rtRegionBgMode: 'none',
                            rtRegionBgColor: '#111215',
                            rtRegionBgGradStart: '',
                            rtRegionBgGradEnd: '',
                            rtRegionBgGradAngle: 135,
                            rtRegionBgImageUrl: '',
                            rtRegionBgUrl: '',
                            rtRegionBodyRadiusPx: 8,
                            rtRegionBodyPaddingY: 8,
                            rtRegionBodyShadowStrength: 0,
                            rtRegionBodyLoopAnim: 'none',
                            // 区域主体 动作动画默认值
                            rtRegionEnterCombo: 'slide-down+fade',
                            rtRegionExitCombo: 'slide-up+fade',
                            rtRegionAnimDuration: 0.18,
                            rtRegionAnimIntensity: 0.5,
                            rtRegionAnimEasing: 'ease-out'
                          });
                      } else if (type === 'divider') {
                        items.push({ id: newId(), type: 'divider' });
                      }
                      setItems(items);
                      renderItemsEditor();
                    } catch(_eAdd){}
                  });
                }
              } catch(_e){}
            })();

            // 初次渲染
            renderItemsEditor();

            // 监听 items 外部变更（粗粒度刷新编辑器）
            try {
              var mo = new (window.MutationObserver || window.WebKitMutationObserver || function(){ this.observe=function(){}; this.disconnect=function(){}; }) (function(){
                try { renderItemsEditor(); } catch(_e){}
              });
              var preview = document.getElementById('live-preview-container');
              if (preview && mo && mo.observe) {
                mo.observe(preview, { childList: true, subtree: true });
              }
            } catch(_eMO){}
          } catch(_eSetup){}
        })();
      }

      if (Ny.Sections && Ny.Sections.ItemsParts) {
        renderNow();
        return;
      }

      try {
        var s = global.document.createElement('script');
        s.src = 'js/sections/section.items.parts.js';
        s.async = false;
        s.onload = renderNow;
        s.onerror = function(){ try{ console.error('[Ny.Sections] Failed to load section.items.parts.js'); }catch(_e){} };
        (global.document.head || global.document.documentElement).appendChild(s);
      } catch(_e) {
        renderNow();
      }
    } catch (e) {
      try { console.warn('[Ny.Sections] renderItems error', e); } catch(_e) {}
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);