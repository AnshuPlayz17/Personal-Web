/* ==========================
   LOADING SCREEN
========================== */


window.addEventListener("load",()=>{

    const loader=document.getElementById("loader");


    setTimeout(()=>{

        loader.style.opacity="0";


        setTimeout(()=>{

            loader.style.display="none";

        },800);


    },1200);


});







/* ==========================
   CUSTOM CURSOR
========================== */


const cursor=document.querySelector(".cursor");


document.addEventListener(
"mousemove",
(e)=>{


cursor.style.left=e.clientX+"px";

cursor.style.top=e.clientY+"px";


});





const links=document.querySelectorAll("a,button");


links.forEach(item=>{


item.addEventListener("mouseenter",()=>{

cursor.style.transform=
"translate(-50%,-50%) scale(2)";

});


item.addEventListener("mouseleave",()=>{

cursor.style.transform=
"translate(-50%,-50%) scale(1)";

});


});









/* ==========================
   SCROLL REVEAL
========================== */


const revealElements=
document.querySelectorAll(".reveal");



function reveal(){


revealElements.forEach(element=>{


let position=

element.getBoundingClientRect().top;



if(position < window.innerHeight-100){


element.style.opacity="1";

element.style.transform="translateY(0)";


}


});


}



reveal();


window.addEventListener(
"scroll",
reveal
);








/* ==========================
   MOBILE MENU
========================== */


const menu=
document.querySelector(".menu");


const nav=
document.querySelector("nav ul");



menu.addEventListener(
"click",
()=>{


if(nav.style.display==="flex"){


nav.style.display="none";


}

else{


nav.style.display="flex";

nav.style.flexDirection="column";

nav.style.position="absolute";

nav.style.right="20px";

nav.style.top="70px";

nav.style.background="#0b0b0b";

nav.style.padding="25px";

nav.style.borderRadius="20px";

}


});








/* ==========================
   SMOOTH NAVIGATION
========================== */


document.querySelectorAll(
'a[href^="#"]'
)
.forEach(anchor=>{


anchor.addEventListener(
"click",
function(e){


e.preventDefault();


document.querySelector(
this.getAttribute("href")
)
.scrollIntoView({

behavior:"smooth"

});


});



});









/* ==========================
   PROJECT CARD EFFECT
========================== */


const cards=
document.querySelectorAll(
".project,.skill-card,.achievement-card,.blog-card"
);



cards.forEach(card=>{


card.addEventListener(
"mousemove",
(e)=>{


const rect=
card.getBoundingClientRect();



const x=
e.clientX-rect.left;


const y=
e.clientY-rect.top;



const rotateX=
(y-rect.height/2)/20*-1;


const rotateY=
(x-rect.width/2)/20;



card.style.transform=

`

perspective(1000px)

rotateX(${rotateX}deg)

rotateY(${rotateY}deg)

translateY(-10px)

`;



});





card.addEventListener(
"mouseleave",
()=>{


card.style.transform="";

});


});









/* ==========================
   CONTACT FORM
========================== */


const form=
document.querySelector(".contact-form");



form.addEventListener(
"submit",
(e)=>{


e.preventDefault();



alert(

"Thanks for reaching out! Please connect through LinkedIn or email."

);



form.reset();


});









/* ==========================
   NAVBAR FADE EFFECT
========================== */


const header=
document.querySelector("nav");



window.addEventListener(
"scroll",
()=>{


if(window.scrollY>50){


header.style.background=

"rgba(5,5,5,0.9)";


}

else{


header.style.background=

"rgba(255,255,255,0.04)";


}



});









/* ==========================
   TYPING EFFECT
========================== */


const words=[

"Robotics",

"Embedded Systems",

"Automation",

"Programming",

"Engineering"

];



let wordIndex=0;

let letterIndex=0;

let deleting=false;



const title=
document.querySelector(".eyebrow");



function typing(){


if(!title)
return;



let current=
words[wordIndex];



if(!deleting){


title.textContent=

"ROBOTICS ENGINEER • "
+
current;



letterIndex++;



if(letterIndex>=current.length){


deleting=true;


setTimeout(typing,1000);

return;

}


}

else{


letterIndex--;



if(letterIndex<=0){


deleting=false;


wordIndex=

(wordIndex+1)%words.length;


}



}


setTimeout(
typing,
deleting?50:100
);



}


typing();









/* ==========================
   KONAMI CODE EASTER EGG
========================== */


let code=[];


const secret=[

"ArrowUp",
"ArrowUp",
"ArrowDown",
"ArrowDown",
"ArrowLeft",
"ArrowRight",
"ArrowLeft",
"ArrowRight"

];



document.addEventListener(
"keydown",
(e)=>{


code.push(e.key);



if(code.length>secret.length){

code.shift();

}



if(
JSON.stringify(code)
===
JSON.stringify(secret)
){


document.body.style.transition="1s";

document.body.style.filter=

"contrast(130%)";


alert(

"Engineering mode activated ⚙️"

);


}



});









/* ==========================
   YEAR UPDATE
========================== */


const year=
document.querySelector("footer p");


if(year){

year.innerHTML=

"© "+new Date().getFullYear()+" Anshu Arunav";


}