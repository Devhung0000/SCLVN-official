document.addEventListener("click",(e)=>{

    const btn=e.target.closest(".ripple");

    if(!btn) return;

    const ripple=document.createElement("span");

    const rect=btn.getBoundingClientRect();

    const size=Math.max(rect.width,rect.height);

    ripple.style.width=size+"px";
    ripple.style.height=size+"px";

    ripple.style.left=(e.clientX-rect.left-size/2)+"px";
    ripple.style.top=(e.clientY-rect.top-size/2)+"px";

    ripple.className="ripple-circle";

    btn.appendChild(ripple);

    ripple.addEventListener("animationend",()=>{

        ripple.remove();

    });

});