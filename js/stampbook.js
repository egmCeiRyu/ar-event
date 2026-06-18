const grid=document.getElementById("stampGrid");

const totalCharacters=9;

for(let i=1;i<=totalCharacters;i++){

const div=document.createElement("div");

div.className="stamp";

div.innerHTML="?";

grid.appendChild(div);

}