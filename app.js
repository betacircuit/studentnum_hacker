(function () {
  "use strict";
  var students = window.STUDENTS || [];
  var names = Array.from(new Set(students.map(function (s) { return s.name; }))).sort(function (a,b) { return a.localeCompare(b,"ko"); });
  var byName = new Map(names.map(function (name) { return [name, students.filter(function (s) { return s.name === name; })]; }));
  var $ = function (id) { return document.getElementById(id); };
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  var numberReels = [], nameReels = [];
  var selectedName = "", numberDisplay = "20251????", results = [], selected = null, mode = "name", sequence = 0, debounce, nameDebounce, composing = false, suggestionAt = -1;

  function Reel(host, symbols, label, locked) {
    this.symbols = symbols;
    this.value = symbols[0];
    this.version = 0;
    this.el = document.createElement("button");
    this.el.type = "button";
    this.el.className = "reel" + (locked ? " locked" : "");
    this.el.setAttribute("aria-label", label);
    this.el.disabled = !!locked;
    this.track = document.createElement("div");
    this.track.className = "track";
    this.track.setAttribute("aria-hidden", "true");
    this.el.appendChild(this.track);
    host.appendChild(this.el);
    this.set(this.value);
  }
  Reel.prototype.neighbor = function (value, direction) {
    if(value === "·" || value === "?" && this.symbols.indexOf("?") === -1) return value;
    if(/^[0-9]$/.test(value) && this.symbols.indexOf("?") !== -1) return String((Number(value)+direction+10)%10);
    var at = this.symbols.indexOf(value);
    return this.symbols[(Math.max(0, at) + direction + this.symbols.length) % this.symbols.length];
  };
  Reel.prototype.draw = function (values) {
    this.track.replaceChildren();
    var self = this;
    values.forEach(function (value) {
      var symbol = document.createElement("span");
      symbol.className = "symbol" + (Array.from(value).length > 1 ? " long" : "");
      symbol.textContent = value;
      self.track.appendChild(symbol);
    });
  };
  Reel.prototype.set = function (value) {
    this.value = value;
    this.el.setAttribute("data-value", value);
    this.draw([this.neighbor(value,-1), value, this.neighbor(value,1)]);
    this.track.style.transform = "translateY(0)";
    this.el.classList.remove("spinning");
    this.el.removeAttribute("aria-busy");
  };
  Reel.prototype.spin = async function (value, duration, turns) {
    var version = ++this.version;
    if (this.animation) this.animation.cancel();
    if (reduced.matches || duration === 0) { this.set(value); return; }
    var strip = [this.neighbor(this.value,-1), this.value];
    var at = Math.max(0, this.symbols.indexOf(this.value));
    for (var i=0; i<turns; i++) strip.push(this.symbols[(at+i+1)%this.symbols.length]);
    strip.push(this.neighbor(value,-1),value,this.neighbor(value,1));
    this.draw(strip);
    var row = this.track.firstElementChild.getBoundingClientRect().height;
    var travel = (strip.length-3)*row;
    var firstStop = Math.min(travel*.87,travel-row*2.5);
    this.el.classList.add("spinning");
    this.track.style.animationDuration = duration + "ms";
    this.el.setAttribute("aria-busy","true");
    this.animation = this.track.animate([
      {transform:"translateY(0)",offset:0,easing:"cubic-bezier(.15,.65,.3,1)"},
      {transform:"translateY("+(-firstStop)+"px)",offset:.58,easing:"cubic-bezier(.2,.65,.35,1)"},
      {transform:"translateY("+(-travel+row*2)+"px)",offset:.79,easing:"cubic-bezier(.2,.8,.35,1)"},
      {transform:"translateY("+(-travel+row)+"px)",offset:.9,easing:"cubic-bezier(.45,0,.2,1)"},
      {transform:"translateY("+(-travel-row*.11)+"px)",offset:.96,easing:"ease-out"},
      {transform:"translateY("+(-travel+row*.035)+"px)",offset:.985,easing:"ease-in-out"},
      {transform:"translateY("+(-travel)+"px)",offset:1}
    ], {duration:duration,fill:"forwards"});
    try { await this.animation.finished; } catch(e) { return; }
    if (version !== this.version) return;
    this.set(value);
    this.animation.cancel();
    this.el.removeAttribute("aria-busy");
  };

  function interactive(reel, step) {
    var wheelAt=0, down=null, dragged=false;
    reel.el.addEventListener("wheel",function (event) {
      event.preventDefault();
      if (Date.now()-wheelAt < 170) return;
      wheelAt=Date.now();
      step(event.deltaY < 0 ? 1 : -1);
    },{passive:false});
    reel.el.addEventListener("keydown",function (event) {
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault(); step(event.key === "ArrowUp" ? 1 : -1);
      }
    });
    reel.el.addEventListener("pointerdown",function (event) { down=event.clientY; dragged=false; reel.el.setPointerCapture(event.pointerId); });
    reel.el.addEventListener("pointerup",function (event) {
      if (down !== null && Math.abs(event.clientY-down) > 12) { dragged=true; step(event.clientY < down ? 1 : -1); }
      down=null;
    });
    reel.el.addEventListener("pointercancel",function () { down=null; });
    reel.el.addEventListener("click",function () { if (!dragged) step(1); dragged=false; });
  }

  Array.from(numberDisplay).forEach(function (digit,i) {
    if (i===4) { var hyphen=document.createElement("span"); hyphen.className="separator"; hyphen.textContent="-"; hyphen.setAttribute("aria-hidden","true"); $("number-dial").appendChild(hyphen); }
    var stack=document.createElement("div"); stack.className="reel-stack";
    $("number-dial").appendChild(stack);
    var up=document.createElement("button"); up.type="button"; up.className="digit-step"+(i<5?" inactive":""); up.textContent="▴"; up.disabled=i<5;
    up.setAttribute("aria-label","학번 "+(i+1)+"번째 숫자 증가"); stack.appendChild(up);
    var reel=new Reel(stack,Array.from("0123456789?"),"학번 "+(i+1)+"번째 숫자",i<5);
    var down=document.createElement("button"); down.type="button"; down.className="digit-step"+(i<5?" inactive":""); down.textContent="▾"; down.disabled=i<5;
    down.setAttribute("aria-label","학번 "+(i+1)+"번째 숫자 감소"); stack.appendChild(down);
    reel.set(digit);
    numberReels.push(reel);
    function stepDigit(direction) {
      var chars=Array.from(numberDisplay);
      var current=/\d/.test(chars[i])?Number(chars[i]):(direction>0?-1:0);
      chars[i]=String((current+direction+10)%10);
      for(var j=5;j<9;j++) if(chars[j]==="?") chars[j]="0";
      $("number-input").value=chars.join("").slice(5);
      lookupNumber(chars.join(""),true);
    }
    if(i>=5) {
      interactive(reel,stepDigit);
      up.addEventListener("click",function () { stepDigit(1); });
      down.addEventListener("click",function () { stepDigit(-1); });
    }
  });
  for (var col=0;col<3;col++) {
    (function (i) {
      var symbols=Array.from(new Set(names.map(function (name) { return Dial.parts(name)[i]; })));
      var reel=new Reel($("name-dial"),symbols,"이름 "+(i+1)+"번째 글자",true);
      reel.set("·"); nameReels.push(reel);
    })(col);
  }

  async function animateName(name,quick) {
    selectedName=name;
    $("name-input").value=name;
    var pieces=name?Dial.parts(name):["?","?","?"];
    $("full-name").hidden=!name || Array.from(name.replace(/\s/g,"")).length===3;
    $("full-name").textContent=name;
    await Promise.all(nameReels.map(function (reel,i) { return reel.spin(pieces[i],quick?170+i*25:1100+i*100,quick?5:30+i*5); }));
  }
  async function animateNumber(display,quick) {
    numberDisplay=display;
    await Promise.all(numberReels.map(function (reel,i) {
      return reel.spin(display[i],i<5?0:(quick?150+(i-5)*20:1000+(i-5)*100),quick?5:35+(i-5)*4);
    }));
  }
  function maskedDisplay(person,people) {
    var ids=Array.from(new Set(people.map(function (p) { return p.id; }).filter(Boolean)));
    if (!person || !person.id) return "20251????";
    if (ids.length===1) return person.id.replace("-","");
    return "20251?"+person.id.slice(-3);
  }
  async function chooseName(name,quick) {
    if (!byName.has(name)) return;
    clearTimeout(debounce);
    clearTimeout(nameDebounce);
    $("name-form").classList.remove("unlisted");
    $("number-input").value="";
    var token=++sequence;
    mode="name";
    results=byName.get(name);
    selected=results[0];
    $("readout").hidden=true;
    await Promise.all([animateName(name,quick),animateNumber(maskedDisplay(selected,results),quick)]);
    if(token===sequence) showReadout();
  }
  async function lookupNumber(raw,quick) {
    clearTimeout(debounce);
    clearTimeout(nameDebounce);
    hideSuggestions();
    $("name-form").classList.remove("unlisted");
    var parsed=Dial.numberQuery(raw);
    if (!parsed.query) return;
    var token=++sequence;
    mode="id";
    results=Lookup.search(students,parsed.query).results;
    selected=results[0] || {name:"",id:parsed.display.indexOf("?")<0?parsed.display.slice(0,4)+"-"+parsed.display.slice(4):"",dept:"",status:"unknown"};
    $("readout").hidden=true;
    await Promise.all([animateNumber(parsed.display,quick),animateName(selected.name,quick)]);
    if(token===sequence) showReadout();
  }
  function showReadout() {
    if (!selected) return;
    $("readout").hidden=false;
    $("department").textContent=selected.dept==="전정 25학번 명단"?"전기·정보공학부":selected.dept;
    $("status-dot").className="status-dot "+selected.status;
    $("status-dot").title=selected.status==="confirmed"?"확인된 정보":selected.status==="unknown"?"학번 정보 없음":"학번 끝 3자리로 추정한 후보";
    $("warning").hidden=selected.status==="confirmed";
    $("candidates").replaceChildren();
    var records=mode==="name"?byName.get(selected.name)||[]:results;
    var ids=Array.from(new Set(records.map(function (s) { return s.id; }).filter(Boolean)));
    if (ids.length>1 || mode==="id" && numberDisplay.indexOf("?")!==-1) {
      ids.forEach(function (id) {
        var b=document.createElement("button"); b.className="candidate"; b.type="button"; b.textContent=id; b.title="이 학번일 가능성이 높음 · 미확정";
        b.addEventListener("click",async function () {
          var token=++sequence;
          selected=records.find(function (s) { return s.id===id && s.name===selectedName; }) || records.find(function (s) { return s.id===id; });
          await Promise.all([animateNumber(id.replace("-",""),true),animateName(selected.name,true)]);
          if(token===sequence) showReadout();
        });
        if(numberDisplay===id.replace("-","")) b.classList.add("current");
        $("candidates").appendChild(b);
      });
    }
    var resultNames=Array.from(new Set(results.map(function (s) { return s.name; })));
    var multiple=mode==="id" && resultNames.length>1;
    $("prev-result").hidden=$("next-result").hidden=!multiple;
    $("result-count").textContent=multiple?(resultNames.indexOf(selected.name)+1)+" / "+resultNames.length:"";
    $("announcement").textContent=(selected.name||"등록되지 않은 학번")+" · "+(selected.id||"2025-1????")+" · "+Lookup.describeMatch(selected,mode,students);
  }
  async function moveResult(direction) {
    var resultNames=Array.from(new Set(results.map(function (s) { return s.name; })));
    var next=(resultNames.indexOf(selected.name)+direction+resultNames.length)%resultNames.length;
    selected=results.find(function (s) { return s.name===resultNames[next]; });
    var token=++sequence;
    await animateName(selected.name,true);
    if(token===sequence) showReadout();
  }

  $("number-form").addEventListener("submit",function (event) { event.preventDefault(); lookupNumber($("number-input").value,true); });
  $("number-input").addEventListener("input",function () {
    this.value=this.value.replace(/[^\d-]/g,"");
    clearTimeout(debounce);
    var value=this.value;
    clearTimeout(nameDebounce);
    if(value.replace(/\D/g,"").length>=3) debounce=setTimeout(function () { lookupNumber(value,true); },180);
  });
  $("prev-result").addEventListener("click",function () { moveResult(-1); });
  $("next-result").addEventListener("click",function () { moveResult(1); });

  function hideSuggestions() {
    $("name-suggestions").hidden=true;
    $("name-input").setAttribute("aria-expanded","false");
    $("name-input").removeAttribute("aria-activedescendant");
  }
  function nameMatches(value) {
    var query=value.replace(/\s/g,"").toLowerCase();
    return names.filter(function (name) { return name.replace(/\s/g,"").toLowerCase().indexOf(query)!==-1; }).slice(0,15);
  }
  function renderNames(value) {
    $("name-suggestions").replaceChildren(); suggestionAt=-1;
    var matches=value.trim()?nameMatches(value):[];
    matches.forEach(function (name,i) {
      var b=document.createElement("button"); b.type="button"; b.className="name-option"; b.id="name-option-"+i; b.textContent=name;
      b.setAttribute("role","option"); b.setAttribute("aria-selected","false");
      b.addEventListener("pointerdown",function (event) { event.preventDefault(); });
      b.addEventListener("click",function () { hideSuggestions(); chooseName(name,true); });
      $("name-suggestions").appendChild(b);
    });
    $("name-suggestions").hidden=!matches.length;
    $("name-input").setAttribute("aria-expanded",String(!!matches.length));
    $("name-input").removeAttribute("aria-activedescendant");
  }
  async function submitName() {
    clearTimeout(nameDebounce); clearTimeout(debounce);
    var value=$("name-input").value.trim();
    if(!value) { hideSuggestions(); return; }
    var exact=names.find(function (name) { return name.replace(/\s/g,"").toLowerCase()===value.replace(/\s/g,"").toLowerCase(); });
    var matches=nameMatches(value);
    var name=exact || (suggestionAt>=0?matches[suggestionAt]:matches.length===1?matches[0]:null);
    if(name) { hideSuggestions(); chooseName(name,true); return; }
    if(matches.length) { renderNames(value); $("name-input").focus(); return; }
    hideSuggestions(); $("number-input").value="";
    mode="name"; results=[]; selected={name:value,id:"",dept:"전기·정보공학부",status:"unknown"};
    var token=++sequence;
    $("name-form").classList.add("unlisted"); $("readout").hidden=true;
    await Promise.all([animateNumber("20251????",true),animateName("",true)]);
    if(token===sequence) { $("name-input").value=value; showReadout(); }
  }
  function nameInputChanged() {
    clearTimeout(nameDebounce); clearTimeout(debounce);
    $("name-form").classList.remove("unlisted");
    var value=$("name-input").value; renderNames(value);
    var exact=names.find(function (name) { return name.replace(/\s/g,"").toLowerCase()===value.replace(/\s/g,"").toLowerCase(); });
    if(exact) nameDebounce=setTimeout(function () { hideSuggestions(); chooseName(exact,true); },120);
  }
  $("name-form").addEventListener("submit",function (event) { event.preventDefault(); if(!composing) submitName(); });
  $("name-input").addEventListener("compositionstart",function () { composing=true; clearTimeout(nameDebounce); });
  $("name-input").addEventListener("compositionend",function () { composing=false; nameInputChanged(); });
  $("name-input").addEventListener("input",function () { if(!composing) nameInputChanged(); });
  $("name-input").addEventListener("focus",function () { renderNames(this.value); });
  $("name-input").addEventListener("blur",function () { setTimeout(hideSuggestions,120); });
  $("name-input").addEventListener("keydown",function (event) {
    if(composing) return;
    if(event.key==="Escape") { hideSuggestions(); return; }
    if(event.key!=="ArrowDown" && event.key!=="ArrowUp") return;
    var options=Array.from($("name-suggestions").children);
    if(!options.length) return;
    event.preventDefault();
    suggestionAt=(suggestionAt+(event.key==="ArrowDown"?1:-1)+options.length)%options.length;
    options.forEach(function (option,i) { option.classList.toggle("selected",i===suggestionAt); option.setAttribute("aria-selected",String(i===suggestionAt)); });
    $("name-suggestions").hidden=false; this.setAttribute("aria-expanded","true"); this.setAttribute("aria-activedescendant",options[suggestionAt].id);
    options[suggestionAt].scrollIntoView({block:"nearest"});
  });
  document.querySelectorAll("[data-close]").forEach(function (button) { button.addEventListener("click",function () { $(button.dataset.close).close(); }); });
  document.querySelectorAll("dialog").forEach(function (dialog) { dialog.addEventListener("click",function (event) { if(event.target===dialog) { var box=dialog.getBoundingClientRect(); if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom) dialog.close(); } }); });

  function suggest(unresolved) {
    if(!selected) return;
    $("suggest-dialog").classList.toggle("unresolved",unresolved);
    $("suggest-message").textContent=unresolved?"이 사람과 관련한 정보를 제안해주세요.":"확인한 정보를 알려주세요.";
    $("suggest-name").value=selected.name;
    $("suggest-id").value=selected.id||"";
    $("suggest-dept").value=selected.dept==="전정 25학번 명단"?"전기·정보공학부":selected.dept;
    $("suggest-note").value="";
    $("request-fallback").hidden=true;
    $("suggest-dialog").showModal();
  }
  $("warning").addEventListener("click",function () { suggest(true); });
  $("request").addEventListener("click",function () { suggest(false); });
  $("suggest-form").addEventListener("submit",function (event) {
    event.preventDefault();
    var name=$("suggest-name").value.trim();
    var body="이름: "+name+"\n학번: "+($("suggest-id").value.trim()||"미확인")+"\n학부: "+$("suggest-dept").value.trim()+"\n\n제안 내용\n"+$("suggest-note").value.trim();
    var url="https://github.com/betacircuit/studentnum_hacker/issues/new?"+new URLSearchParams({title:"정보 수정 요청: "+name,body:body}).toString();
    $("request-fallback").href=url;
    $("request-fallback").hidden=false;
    window.open(url,"_blank","noopener,noreferrer");
  });
})();
