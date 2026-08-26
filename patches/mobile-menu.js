document.addEventListener('DOMContentLoaded',function(){
  document.querySelectorAll('body > div').forEach(function(element){
    if(element.textContent.trim()==='V3 · MULTI-PAGE')element.remove();
  });

  const nav=document.getElementById('nav');
  const button=document.getElementById('menubtn');
  const header=document.querySelector('header');
  if(!nav||!button||!header)return;

  const updateTop=()=>nav.style.setProperty('--mobile-nav-top',Math.max(0,header.getBoundingClientRect().bottom)+'px');
  const setOpen=(open)=>{
    nav.classList.toggle('open',open);
    document.body.classList.toggle('menu-open',open);
    button.setAttribute('aria-controls','nav');
    button.setAttribute('aria-expanded',String(open));
    button.textContent=open?'Закрыть':'Меню';
    if(open)updateTop();
  };

  setOpen(false);
  button.onclick=function(event){
    event.preventDefault();
    setOpen(!nav.classList.contains('open'));
  };
  nav.addEventListener('click',event=>{if(event.target.closest('a'))setOpen(false)});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')setOpen(false)});
  window.addEventListener('resize',()=>{if(innerWidth>860)setOpen(false);else if(nav.classList.contains('open'))updateTop()});
  window.addEventListener('scroll',()=>{if(nav.classList.contains('open'))updateTop()},{passive:true});
});
