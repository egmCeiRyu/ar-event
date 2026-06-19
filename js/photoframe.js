const grid = document.getElementById("frameGrid");

for(let i=1;i<=14;i++){

    const btn=document.createElement("button");

    btn.className="frame-btn";

    btn.innerHTML=`
        <img src="assets/photoframe/frame01.webp">
    `;

    btn.onclick=()=>{

        alert("カメラを起動します"+i);

    };

    grid.appendChild(btn);

}