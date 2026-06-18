const grid = document.querySelector(".grid");

for(let i=1;i<=14;i++){

const div=document.createElement("div");

div.className="frame";

div.innerHTML=

`<img src="assets/frames/frame${i}.png">`;

div.onclick=()=>{

window.location=

`photoframe_ar.html?id=${i}`;

}

grid.appendChild(div);

}