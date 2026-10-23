(function(){
var C=window.QF||{},$=function(i){return document.getElementById(i)},LS=window.localStorage;
function ld(k,d){try{return JSON.parse(LS.getItem(k))||d}catch(e){return d}}
function sv(k,v){try{LS.setItem(k,JSON.stringify(v))}catch(e){}}
function dec(s){var t=document.createElement('textarea');t.innerHTML=s||'';return t.value}
function pad(n){return String(n).padStart(2,'0')}
function dur(s){var m=/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(s||'');if(!m)return'';var h=+m[1]||0,mi=+m[2]||0,se=+m[3]||0;return h?h+':'+pad(mi)+':'+pad(se):mi+':'+pad(se)}
var chans=ld('qf.ch',null)||(C.CHANNELS||[]).map(function(h){return{h:h,m:false}});
var S=ld('qf.pl',null);if(!S||!S.video||!S.music)S={video:[{n:'Watch later',items:[]}],music:[{n:'Liked tracks',items:[]}]};
var V=[],Q=[],qi=0,f=-1,sk='video',op=null,pk=null,token=null,tc=null,yp=null,custom=false,started=false,tm=null;
function msg(t){$('msg').textContent=t;$('msg').hidden=!t}
function store(){sv('qf.pl',S)}
function saveCh(){sv('qf.ch',chans)}
function reload(){clearTimeout(tm);tm=setTimeout(loadFeed,600)}

async function api(p,q,auth){
  var h={};q=Object.assign({},q);
  if(auth)h.Authorization='Bearer '+token;
  else{if(!C.API_KEY)throw new Error('Add your API key to config.js first.');q.key=C.API_KEY}
  var r=await fetch('https://www.googleapis.com/youtube/v3/'+p+'?'+new URLSearchParams(q),{headers:h}),j=await r.json();
  if(!r.ok)throw new Error((j.error&&j.error.message)||'Request failed');
  return j;
}
async function resolve(h){
  var j=await api('channels',{part:'snippet,contentDetails',forHandle:'@'+h.replace(/^@/,'')}),c=j.items&&j.items[0];
  if(!c)throw new Error('Could not find '+h);
  return{h:h,id:c.id,n:c.snippet.title,u:c.contentDetails.relatedPlaylists.uploads};
}
function parseH(s){var m=s.match(/@([A-Za-z0-9._-]+)/);if(m)return m[1];return s.trim().replace(/^https?:\/\/(www\.)?youtube\.com\//,'').split(/[\/?#]/)[0]}

/* saving */
var BM='<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z" fill="FILL" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
function has(k,id){return S[k].some(function(p){return p.items.some(function(x){return x.id===id})})}
function mark(b,k,id){var on=has('video',id)||has('music',id);b.innerHTML=BM.replace('FILL',on?'currentColor':'none');b.setAttribute('aria-label',on?'Saved. Change playlists':'Save to playlist');b.setAttribute('aria-pressed',String(on))}
function slim(v){return{id:v.id,t:v.t,c:v.c,th:v.th,d:v.d}}
function askSave(k,item,done){pk={k:k,item:item,done:done};pick();$('pick').hidden=false}
function pick(){$('pk1').setAttribute('aria-pressed',String(pk.k==='video'));$('pk2').setAttribute('aria-pressed',String(pk.k==='music'));
  var el=$('pl');el.innerHTML='';
  S[pk.k].forEach(function(p){
    var on=p.items.some(function(x){return x.id===pk.item.id}),b=document.createElement('button');
    b.className='fold';b.innerHTML='<span></span><span>'+(on?'Saved':'Add')+'</span>';b.children[0].textContent=p.n;b.setAttribute('aria-pressed',String(on));
    b.onclick=function(){p.items=on?p.items.filter(function(x){return x.id!==pk.item.id}):p.items.concat([slim(pk.item)]);store();pick()};
    el.appendChild(b);
  });
}
$('pa').onclick=function(){var i=$('pn'),n=i.value.trim();if(!n)return;S[pk.k].push({n:n,items:[slim(pk.item)]});i.value='';store();pick()};
$('pk1').onclick=function(){pk.k='video';pick()};$('pk2').onclick=function(){pk.k='music';pick()};
$('pd').onclick=function(){$('pick').hidden=true;if(pk&&pk.done)pk.done();pk=null;if(!$('saved').hidden)savedView()};

/* feed */
function card(v,fn){
  var b=document.createElement('div');b.className='card';
  b.innerHTML='<button class="open"><b></b><i></i><img class="px" alt="" loading="lazy"></button>';
  b.querySelector('b').textContent=v.t;b.querySelector('i').textContent=v.c+(v.d?', '+v.d:'');b.querySelector('img').src=v.th;
  b.querySelector('.open').onclick=fn;return b;
}
function list(){var el=$('list');el.innerHTML='';V.filter(function(v){return f<0||v.ci===f}).forEach(function(v){el.appendChild(card(v,function(){openVid(v)}))})}
function chips(){
  var el=$('chips');el.innerHTML='';
  ['All'].concat(chans.map(function(c){return c.n||c.h}),['+']).forEach(function(n,i,a){
    var b=document.createElement('button'),add=i===a.length-1;b.textContent=n;
    if(add)b.setAttribute('aria-label','Add channel');
    b.setAttribute('aria-pressed',String(!add&&f===i-1));
    b.onclick=function(){if(add){$('addch').hidden=!$('addch').hidden;return}f=i-1;chips();list()};
    el.appendChild(b);
  });
}
function chl(){
  var el=$('cl');el.innerHTML='';
  chans.forEach(function(c,i){
    var r=document.createElement('div');r.className='row r3';
    r.innerHTML='<div class="go"></div><button class="rm">Remove</button>';
    r.firstChild.textContent=c.n||c.h;
    
    
    r.lastChild.onclick=function(){chans.splice(i,1);f=-1;V=[];saveCh();chips();list();chl();reload()};
    el.appendChild(r);
  });
}
async function loadFeed(){
  if(!C.API_KEY){msg('Add your API key to config.js to load videos.');return}
  if(!chans.length){V=[];list();msg('No channels yet. Tap + to add one.');return}
  msg('Loading…');
  var all=[],bad=[];
  try{
    await Promise.all(chans.map(async function(c,i){
      try{
        if(!c.u)Object.assign(c,await resolve(c.h));
        var j=await api('playlistItems',{part:'snippet',playlistId:c.u,maxResults:8});
        j.items.forEach(function(x){
          var s=x.snippet,t=s.thumbnails||{},th=(t.medium||t.high||t.default||{}).url;
          if(th)all.push({id:s.resourceId.videoId,t:s.title,c:c.n,ci:i,th:th,at:s.publishedAt});
        });
      }catch(e){bad.push(c.h)}
    }));
    all.sort(function(a,b){return a.at<b.at?1:-1});
    for(var k=0;k<all.length;k+=50){
      var part=all.slice(k,k+50),j=await api('videos',{part:'contentDetails',id:part.map(function(x){return x.id}).join(',')}),m={};
      j.items.forEach(function(x){m[x.id]=dur(x.contentDetails.duration)});
      part.forEach(function(x){x.d=m[x.id]});
    }
    V=all;saveCh();chips();list();chl();
    msg(bad.length?'Could not load: '+bad.join(', '):'');
  }catch(e){msg(e.message)}
}

/* video sheet */
function openVid(v){
  $('pf').innerHTML='<iframe src="https://www.youtube.com/embed/'+encodeURIComponent(v.id)+'?playsinline=1&rel=0&autoplay=1" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="Video player"></iframe>';
  $('st').textContent=v.t;$('sc').textContent=v.c;noteLoad(v);
  var sb=$('ssv'),sf=$('sf');
  mark(sb,'video',v.id);sb.onclick=function(){askSave('video',v,function(){mark(sb,'video',v.id)})};
  sf.disabled=false;sf.textContent='Add channel to feed';
  sf.hidden=!(v.cid&&!chans.some(function(c){return c.id===v.cid}));
  sf.onclick=function(){chans.push({h:v.c,id:v.cid,n:v.c,u:'UU'+v.cid.slice(2),m:false});saveCh();chips();chl();reload();sf.textContent='Added';sf.disabled=true};
  $('sheet').hidden=false;
}
$('close').onclick=function(){saveNote();$('pf').innerHTML='';$('sheet').hidden=true};

/* add channel, search */
$('ca').onclick=async function(){
  var i=$('cn'),h=parseH(i.value);if(!h)return;
  try{
    var r=await resolve(h);
    if(chans.some(function(c){return c.id===r.id}))return;
    r.m=false;chans.push(r);i.value='';saveCh();chips();chl();reload();
  }catch(e){msg(e.message)}
};
$('cn').onkeydown=function(e){if(e.key==='Enter')$('ca').onclick()};
function clearSearch(){$('res').hidden=true;$('list').hidden=false;$('chips').hidden=false;$('q').value='';msg('')}
async function doSearch(){
  var q=$('q').value.trim();if(!q)return;msg('Searching…');
  try{
    var j=await api('search',{part:'snippet',type:'video',maxResults:15,q:q}),
    res=j.items.map(function(x){var s=x.snippet;return{id:x.id.videoId,t:dec(s.title),c:dec(s.channelTitle),cid:s.channelId,th:(s.thumbnails.medium||s.thumbnails.default).url}});
    if(res.length){
      var d=await api('videos',{part:'contentDetails',id:res.map(function(x){return x.id}).join(',')}),m={};
      d.items.forEach(function(x){m[x.id]=dur(x.contentDetails.duration)});
      res.forEach(function(x){x.d=m[x.id]});
    }
    var el=$('res'),hd=document.createElement('div'),w=document.createElement('div');el.innerHTML='';
    hd.className='hd';hd.innerHTML='<h2></h2><button>Clear</button>';hd.children[0].textContent='Results for '+q;hd.children[1].onclick=clearSearch;
    w.className='list';res.forEach(function(v){w.appendChild(card(v,function(){openVid(v)}))});
    el.appendChild(hd);el.appendChild(w);el.hidden=false;
    ['list','chips','addch','msg'].forEach(function(i){$(i).hidden=true});
  }catch(e){msg(e.message)}
}
$('qb').onclick=doSearch;
$('q').onkeydown=function(e){if(e.key==='Enter')doSearch()};

/* music */
var ART=(C.ART&&C.ART.length)?C.ART:['art-1.png','art-2.png','art-3.png'],artOn=ld('qf.art','on')!=='off';
function ai(id){var h=0;for(var i=0;i<id.length;i++)h=(h*31+id.charCodeAt(i))|0;return Math.abs(h)%ART.length}
function thumb(v){
  var d;
  if(artOn){d=document.createElement('div');d.className='dw';d.innerHTML='<div class="da"></div>';d.firstChild.style.setProperty('--a','url('+ART[ai(v.id)]+')')}
  else{d=document.createElement('img');d.alt='';d.loading='lazy';d.src=v.th}
  return d;
}
function hero(v){
  var h=$('hero'),d=h.querySelector('.da'),im=$('heroimg');h.hidden=false;
  d.style.setProperty('--a','url('+ART[ai(v.id)]+')');d.hidden=!artOn;im.hidden=artOn;if(!artOn)im.src=v.th;
}
$('am').setAttribute('aria-pressed',String(artOn));
$('am').onclick=function(){artOn=!artOn;sv('qf.art',artOn?'on':'off');$('am').setAttribute('aria-pressed',String(artOn));if(started&&Q[qi])hero(Q[qi]);mRender()};
var A=ld('qf.ar',[]),M=[],ma=-1,mmode='songs',sres=null,sq='',mLoaded=false;
function ic(d){return '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><path d="'+d+'"/></svg>'}
var IC={prev:ic('M6 6h2v12H6zM20 6v12L9.5 12z'),next:ic('M16 6h2v12h-2zM4 6v12l10.5-6z'),play:ic('M7 4v16l13-8z'),pause:ic('M6 5h4v14H6zM14 5h4v14h-4z')};
$('prev').innerHTML=IC.prev;$('next').innerHTML=IC.next;$('pp').innerHTML=IC.play;mark($('msv'),'music','x');
function saveA(){sv('qf.ar',A)}
function mmsg(t){$('mmsg').textContent=t;$('mmsg').hidden=!t}
function mkTrack(x){var s=x.snippet,t=s.thumbnails||{};return{id:x.id.videoId||(s.resourceId&&s.resourceId.videoId),t:dec(s.title),c:dec(s.channelTitle||''),th:(t.medium||t.high||t.default||{}).url}}
async function durs(list){
  for(var k=0;k<list.length;k+=50){
    var part=list.slice(k,k+50),j=await api('videos',{part:'contentDetails',id:part.map(function(x){return x.id}).join(',')}),m={};
    j.items.forEach(function(x){m[x.id]=dur(x.contentDetails.duration)});part.forEach(function(x){x.d=m[x.id]});
  }
}
async function loadMusic(){
  if(!C.API_KEY||!A.length){M=[];mRender();return}
  try{
    var all=[],need=A.filter(function(a){return!a.a}).map(function(a){return a.id});
    if(need.length){
      var j=await api('channels',{part:'snippet',id:need.join(',')});
      j.items.forEach(function(x){A.forEach(function(a){if(a.id===x.id)a.a=(x.snippet.thumbnails.medium||x.snippet.thumbnails.default).url})});saveA();
    }
    await Promise.all(A.map(async function(a,i){
      try{
        var r=await api('playlistItems',{part:'snippet',playlistId:a.u,maxResults:10});
        r.items.forEach(function(x){var s=x.snippet,t=s.thumbnails||{},th=(t.medium||t.high||t.default||{}).url;if(th)all.push({id:s.resourceId.videoId,t:s.title,c:a.n,ai:i,th:th,at:s.publishedAt})});
      }catch(e){}
    }));
    all.sort(function(a,b){return a.at<b.at?1:-1});
    await durs(all);M=all;mmsg('');
  }catch(e){mmsg(e.message)}
  mRender();
}
function mRender(){
  var el=$('ar');el.innerHTML='';
  A.forEach(function(a,i){
    var b=document.createElement('button');b.className='ar';b.setAttribute('aria-pressed',String(ma===i));
    b.innerHTML='<img alt=""><span></span>';if(a.a)b.firstChild.src=a.a;b.lastChild.textContent=a.n;
    b.onclick=function(){ma=ma===i?-1:i;sres=null;custom=false;setMode('songs')};el.appendChild(b);
  });
  var pl=document.createElement('button');pl.className='ar';pl.innerHTML='<div class="pc">+</div><span>Add artist</span>';
  pl.onclick=function(){setMode('artists');$('ms').focus()};el.appendChild(pl);
  var L=custom?Q:(sres||M.filter(function(v){return ma<0||v.ai===ma})),t=$('trl'),h=document.createElement('h2');
  t.innerHTML='';h.className='mh';h.textContent=custom?'Your playlist':sres?'Results for '+sq:'New from your artists';t.appendChild(h);
  if(custom||sres){var bk=document.createElement('button');bk.className='bk';bk.textContent='Back to my artists';bk.onclick=function(){custom=false;sres=null;mRender()};t.appendChild(bk)}
  if(!L.length)t.insertAdjacentHTML('beforeend','<p class="empty">'+(A.length||sres?'Nothing here yet.':'Tap Add artist to fill this tab, or search for a song.')+'</p>');
  L.forEach(function(v,i){
    var b=document.createElement('button');b.className='tr';
    b.innerHTML='<img alt="" loading="lazy"><span><b></b><small></small></span><small></small>';
    b.replaceChild(thumb(v),b.firstChild);b.children[1].firstChild.textContent=v.t;b.children[1].lastChild.textContent=v.c;b.lastChild.textContent=v.d||'';
    if(started&&Q[qi]&&Q[qi].id===v.id)b.setAttribute('aria-current','true');
    b.onclick=function(){Q=L.slice();playQ(i)};t.appendChild(b);
  });
  alist();$('trl').hidden=mmode==='artists';$('apan').hidden=mmode!=='artists';
}
function alist(){
  var el=$('al');el.innerHTML='';if(A.length)el.insertAdjacentHTML('beforeend','<p class="empty">Your artists</p>');
  A.forEach(function(a,i){
    var r=document.createElement('div');r.className='row';r.innerHTML='<div class="go"></div><button class="rm">Remove</button>';
    r.firstChild.textContent=a.n;r.lastChild.onclick=function(){A.splice(i,1);ma=-1;saveA();loadMusic()};el.appendChild(r);
  });
}
function setMode(m){
  mmode=m;$('m1').setAttribute('aria-pressed',String(m==='songs'));$('m2').setAttribute('aria-pressed',String(m==='artists'));
  $('ms').placeholder=m==='songs'?'Search songs':'Search artists';$('ms').setAttribute('aria-label',$('ms').placeholder);mRender();
}
async function songSearch(){
  var q=$('ms').value.trim();if(!q)return;mmsg('Searching…');
  try{
    var j=await api('search',{part:'snippet',type:'video',videoCategoryId:'10',videoEmbeddable:'true',maxResults:20,q:q}),res=j.items.map(mkTrack);
    if(res.length)await durs(res);
    sres=res;sq=q;custom=false;mmsg('');mRender();
  }catch(e){mmsg(e.message)}
}
async function artistSearch(){
  var q=$('ms').value.trim();if(!q)return;mmsg('Searching…');
  try{
    var j=await api('search',{part:'snippet',type:'channel',maxResults:6,q:q}),el=$('ares');el.innerHTML='';
    j.items.forEach(function(x){
      var s=x.snippet,id=s.channelId||x.id.channelId;if(A.some(function(a){return a.id===id}))return;
      var r=document.createElement('div');r.className='row';r.innerHTML='<div class="go"></div><button class="rm">Add</button>';
      r.firstChild.textContent=dec(s.title);
      r.lastChild.onclick=function(){A.push({id:id,n:dec(s.title),u:'UU'+id.slice(2),a:(s.thumbnails.medium||s.thumbnails.default).url});saveA();r.remove();alist();loadMusic()};
      el.appendChild(r);
    });
    mmsg('');
  }catch(e){mmsg(e.message)}
}
$('mb').onclick=function(){if(mmode==='songs')songSearch();else artistSearch()};
$('ms').onkeydown=function(e){if(e.key==='Enter')$('mb').onclick()};
$('m1').onclick=function(){setMode('songs')};$('m2').onclick=function(){setMode('artists')};
function mOpen(){if(!mLoaded){mLoaded=true;loadMusic()}else mRender()}
function now(){var v=Q[qi];if(!v)return;hero(v);$('nt').textContent=v.t;$('na').textContent=v.c;mark($('msv'),'music',v.id);$('ytm').href='https://music.youtube.com/watch?v='+encodeURIComponent(v.id);mRender()}
function mk(id){yp=new YT.Player('yt',{videoId:id,playerVars:{playsinline:1,rel:0},events:{onStateChange:function(e){$('pp').innerHTML=e.data===1?IC.pause:IC.play;if(e.data===0&&Q.length)playQ((qi+1)%Q.length)}}})}
function initYT(id){
  if(window.YT&&YT.Player)return mk(id);
  window.onYouTubeIframeAPIReady=function(){mk(id)};
  if(!$('yta')){var s=document.createElement('script');s.id='yta';s.src='https://www.youtube.com/iframe_api';document.head.appendChild(s)}
}
function playQ(i){
  if(!Q[i])return;qi=i;started=true;$('mp').hidden=false;now();
  if(yp&&yp.loadVideoById)yp.loadVideoById(Q[i].id);else initYT(Q[i].id);
  window.scrollTo(0,0);
}
$('pp').onclick=function(){if(yp&&yp.getPlayerState){if(yp.getPlayerState()===1)yp.pauseVideo();else yp.playVideo()}};
$('next').onclick=function(){if(Q.length)playQ((qi+1)%Q.length)};
$('prev').onclick=function(){if(Q.length)playQ((qi+Q.length-1)%Q.length)};
$('msv').onclick=function(){var v=Q[qi];if(v)askSave('music',v,function(){mark($('msv'),'music',v.id)})};

/* notes */
var N=ld('qf.nt',[]),cv=null,ntm=null;
function noteLoad(v){cv=v;var n=N.filter(function(x){return x.id===v.id})[0];$('nb').value=n?n.text:'';$('ns').textContent=''}
function saveNote(){
  clearTimeout(ntm);if(!cv)return;
  var t=$('nb').value,i=N.map(function(x){return x.id}).indexOf(cv.id);
  if(!t.trim()){if(i>=0)N.splice(i,1)}
  else{var o={id:cv.id,t:cv.t,c:cv.c,th:cv.th,d:cv.d,text:t,at:Date.now()};if(i>=0)N[i]=o;else N.unshift(o)}
  sv('qf.nt',N);$('ns').textContent='Saved';
}
$('nb').oninput=function(){$('ns').textContent='';clearTimeout(ntm);ntm=setTimeout(saveNote,600)};
function notesView(){
  var el=$('sbody');el.innerHTML='';
  if(!N.length){el.innerHTML='<p class="empty">No notes yet. Open a video and type in the notes box under it.</p>';return}
  N.forEach(function(n){
    var r=document.createElement('div');r.className='row';var armed=false;
    r.innerHTML='<button class="go"><b></b><br><small></small><span class="pv"></span></button><button class="rm">Delete</button>';
    r.querySelector('b').textContent=n.t;r.querySelector('small').textContent=n.c+', '+new Date(n.at).toLocaleDateString();
    r.querySelector('.pv').textContent=n.text.length>140?n.text.slice(0,140)+'…':n.text;
    r.querySelector('.go').onclick=function(){openVid(n)};
    var del=r.querySelector('.rm');
    del.onclick=function(){if(!armed){armed=true;del.textContent='Tap again';return}N=N.filter(function(x){return x.id!==n.id});sv('qf.nt',N);notesView()};
    el.appendChild(r);
  });
}

/* saved */
function savedView(){
  var el=$('sbody'),L=S[sk];el.innerHTML='';
  $('sv1').setAttribute('aria-pressed',String(sk==='video'));$('sv2').setAttribute('aria-pressed',String(sk==='music'));$('sv3').setAttribute('aria-pressed',String(sk==='notes'));if(sk==='notes')return notesView();
  if(op!==null&&L[op]){
    var p=L[op],hd=document.createElement('div'),armed=false;hd.className='hd';
    hd.innerHTML='<button>Back</button><h2></h2><button>Delete</button>';hd.children[1].textContent=p.n;
    hd.children[0].onclick=function(){op=null;savedView()};
    var del=hd.children[2];
    del.onclick=function(){if(!armed){armed=true;del.textContent='Tap again';return}L.splice(op,1);op=null;store();savedView()};
    el.appendChild(hd);
    if(!p.items.length)el.insertAdjacentHTML('beforeend','<p class="empty">Nothing saved here yet. Open a video or track and tap the bookmark.</p>');
    p.items.forEach(function(x,i){
      var r=document.createElement('div');r.className='row';
      r.innerHTML='<button class="go"><b></b><br><small></small></button><button class="rm">Remove</button>';
      r.querySelector('b').textContent=x.t;r.querySelector('small').textContent=x.c;
      r.querySelector('.go').onclick=function(){if(sk==='video')openVid(x);else{Q=p.items;custom=true;tab(2);playQ(i)}};
      r.querySelector('.rm').onclick=function(){p.items=p.items.filter(function(y){return y.id!==x.id});store();savedView()};
      el.appendChild(r);
    });
    return;
  }
  L.forEach(function(p,i){
    var b=document.createElement('button');b.className='fold';
    b.innerHTML='<span></span><span>'+p.items.length+'</span>';b.children[0].textContent=p.n;
    b.onclick=function(){op=i;savedView()};el.appendChild(b);
  });
  var a=document.createElement('div');a.className='add';
  a.innerHTML='<input placeholder="New playlist name" maxlength="40" aria-label="New playlist name"><button>Create</button>';
  a.lastChild.onclick=function(){var n=a.firstChild.value.trim();if(!n)return;L.push({n:n,items:[]});store();savedView()};
  el.appendChild(a);
}
$('sv1').onclick=function(){sk='video';op=null;savedView()};
$('sv2').onclick=function(){sk='music';op=null;savedView()};
$('sv3').onclick=function(){sk='notes';op=null;savedView()};
function tab(n){
  ['feed','music','saved'].forEach(function(s,i){$(s).hidden=n!==i+1;$('t'+(i+1)).setAttribute('aria-selected',String(n===i+1))});
  document.body.classList.toggle('mm',n===2);if(n===3)savedView();if(n===2)mOpen();window.scrollTo(0,0);
}
$('t1').onclick=function(){tab(1)};$('t2').onclick=function(){tab(2)};$('t3').onclick=function(){tab(3)};

/* Google sign-in and subscription import */
function loadGsi(){if(!C.CLIENT_ID||$('gsi'))return;var s=document.createElement('script');s.id='gsi';s.src='https://accounts.google.com/gsi/client';document.head.appendChild(s)}
function signin(cb){
  if(!C.CLIENT_ID){msg('Add your CLIENT_ID to config.js to turn on sign-in.');return}
  if(!(window.google&&google.accounts&&google.accounts.oauth2)){msg('Sign-in is still loading. Try again in a moment.');return}
  tc=tc||google.accounts.oauth2.initTokenClient({client_id:C.CLIENT_ID,scope:'https://www.googleapis.com/auth/youtube.readonly',callback:function(r){
    if(r.access_token){token=r.access_token;$('gs').hidden=false;$('gi').textContent='Switch account';if(cb)cb()}
    else if(r.error)msg('Sign-in failed: '+r.error);
  }});
  tc.requestAccessToken({prompt:'select_account'});
}
async function subs(){
  try{
    var out=[],pt='';
    for(var p=0;p<4;p++){
      var q={part:'snippet',mine:'true',maxResults:50};if(pt)q.pageToken=pt;
      var j=await api('subscriptions',q,true);out=out.concat(j.items);pt=j.nextPageToken;if(!pt)break;
    }
    var el=$('sl');el.innerHTML='<p class="empty">Tap Add on the channels you want in your feed.</p>';
    out.forEach(function(x){
      var s=x.snippet,id=s.resourceId.channelId;if(chans.some(function(c){return c.id===id}))return;
      var r=document.createElement('div');r.className='row';r.innerHTML='<div class="go"></div><button class="rm">Add</button>';
      r.firstChild.textContent=s.title;
      r.lastChild.onclick=function(){chans.push({h:s.title,id:id,n:s.title,u:'UU'+id.slice(2),m:false});r.remove();saveCh();chips();chl();reload()};
      el.appendChild(r);
    });
  }catch(e){msg(e.message)}
}
$('gi').onclick=function(){signin()};
$('gs').onclick=subs;
$('wi').onclick=function(){sv('qf.seen',1);$('welcome').hidden=true;signin(function(){tab(1);$('addch').hidden=false;subs()})};
$('ws').onclick=function(){sv('qf.seen',1);$('welcome').hidden=true};

function clock(){var d=new Date();$('clock').textContent=pad(d.getHours())+':'+pad(d.getMinutes())}
clock();setInterval(clock,20000);
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(function(){});
loadGsi();
if(!ld('qf.seen',0))$('welcome').hidden=false;
chips();chl();list();loadFeed();
})();
