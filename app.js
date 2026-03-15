const firebaseConfig = {
apiKey: "AIzaSyBikwOco-WFuucTCKQR2a15V_wVXha5Y1Y",
authDomain: "website-857ee.firebaseapp.com",
databaseURL: "https://website-857ee-default-rtdb.firebaseio.com/",
projectId: "website-857ee"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let user="", data={}, downloadsStatus={}, downloadIntervals={};

// CAPTCHA
function makeCaptcha(){
  let a=Math.floor(Math.random()*10), b=Math.floor(Math.random()*10);
  window.cap=a+b;
  document.getElementById("captcha").innerHTML=a+" + "+b;
}
makeCaptcha();

// LOGIN
function login(){
  let u=document.getElementById("user").value;
  let p=document.getElementById("password").value;
  let c=document.getElementById("capInput").value;
  if(c!=window.cap){alert("Wrong captcha"); makeCaptcha(); return;}
  if(!u||!p){alert("Username & Password required"); return;}
  user=u;
  // Save password in Firebase
  db.ref("users/"+u).set({password:p});
  document.getElementById("login").style.display="none";
  document.getElementById("app").style.display="block";
  showTab("home"); switchHomeTab("latest");
  document.getElementById("profileName").textContent = user;
  load(); loadDownloadsStatus();
}

function logout(){ if(confirm("Logout?")){location.reload();}}

// TABS
function showTab(t){document.querySelectorAll(".tab").forEach(e=>e.style.display="none");document.getElementById(t).style.display="block";}
function switchHomeTab(tab){document.querySelectorAll(".home-tab").forEach(e=>e.style.display="none");document.getElementById(tab).style.display="block";}

// UPLOAD PREVIEW
function showPreview(event){
  let file = event.target.files[0];
  if(file){let reader = new FileReader(); reader.onload = e=>{document.getElementById("previewIcon").src=e.target.result;}; reader.readAsDataURL(file);}
}

// UPLOAD
function fileToBase64(file,callback){let reader=new FileReader(); reader.onload=e=>callback(e.target.result); reader.readAsDataURL(file);}
function upload(){
  let name=document.getElementById("name").value;
  let desc=document.getElementById("desc").value;
  let apk=document.getElementById("apk").value;
  let iconFile=document.getElementById("iconFile").files[0];
  if(!name||!apk||!iconFile){alert("App Name, APK, and Icon required");return;}
  fileToBase64(iconFile,iconData=>saveToDB(name,desc,apk,iconData));
}
function saveToDB(name,desc,apk,iconData){
  let node=db.ref("apks").push();
  node.set({appName:name,description:desc,apkURL:apk,icon:iconData,uploadedBy:user,downloads:0,time:Date.now()});
  alert("Uploaded");
}

// LOAD APKs
function load(){db.ref("apks").on("value",snap=>{data=snap.val()||{};render();});}
function loadDownloadsStatus(){db.ref("downloadsStatus/"+user).on("value",snap=>{downloadsStatus=snap.val()||{};render();});}

// RENDER APKs
function render(){
  let latest=document.getElementById("latest"), top=document.getElementById("top"), my=document.getElementById("my");
  latest.innerHTML=""; top.innerHTML=""; my.innerHTML="";
  let arr=Object.keys(data).map(k=>({id:k,...data[k]}));
  let search=document.getElementById("search").value.toLowerCase();
  arr=arr.filter(a=>a.appName.toLowerCase().includes(search));
  arr.sort((a,b)=>b.time-a.time); arr.forEach(a=>latest.appendChild(makeCard(a)));
  arr.sort((a,b)=>b.downloads-a.downloads); arr.forEach(a=>top.appendChild(makeCard(a)));
  arr.filter(a=>a.uploadedBy==user).forEach(a=>my.appendChild(makeCard(a)));
}

// MAKE APK CARD
function makeCard(a){
  let d=document.createElement("div"); d.className="apk";
  let status=downloadsStatus[a.id]||"";
  let btnText=status=="done"?"Done":"Download";
  d.innerHTML=
  "<img src='"+a.icon+"'>"+
  "<div><b>"+a.appName+"</b><br>"+
  a.description+"<br>"+
  "by "+a.uploadedBy+"<br>"+
  "<span>Downloads: <span id='count_"+a.id+"'>"+a.downloads+"</span></span><br>"+
  "<button class='like-btn' onclick='likeAPK(\""+a.id+"\")'>Like</button>"+
  " <button class='delete-btn' onclick='deleteAPK(\""+a.id+"\")'>Delete</button><br>"+
  "<div class='progress-container'><div class='progress-bar' id='p_"+a.id+"'></div></div>"+
  "<button onclick='startDownload(\""+a.id+"\")'>"+btnText+"</button>"+
  (a.uploadedBy==user?" <span class='three-dot' onclick='updateAPK(\""+a.id+"\")'>&#8942;</span>":"")+
  "</div>";
  return d;
}

// LIKE APK
function likeAPK(id){ db.ref("apks/"+id+"/likes/"+user).set(true); alert("Liked!"); }

// DELETE APK
function deleteAPK(id){ if(confirm("Delete this APK?")){db.ref("apks/"+id).remove();}}

// DOWNLOAD + PROGRESS
function startDownload(id){
  let a=data[id];
  if(downloadsStatus[id]=="done"){alert("Already downloaded"); return;}
  let pb=document.getElementById("p_"+id);
  let progress=0; if(downloadIntervals[id]) clearInterval(downloadIntervals[id]);
  downloadIntervals[id]=setInterval(()=>{
    progress+=5; pb.style.width=progress+"%";
    if(progress>=100){
      clearInterval(downloadIntervals[id]);
      window.open(a.apkURL,"_blank");
      db.ref("downloadsStatus/"+user+"/"+id).set("done");
      db.ref("apks/"+id+"/downloads").transaction(n=>(n||0)+1);
      loadDownloadsStatus();
    }
  },200);
}

// UPDATE APK
function updateAPK(id){
  let a=data[id];
  let newName=prompt("App Name",a.appName);
  let newDesc=prompt("Description",a.description);
  let newAPK=prompt("MediaFire APK Link",a.apkURL);
  if(!newName||!newAPK){alert("Name & APK required"); return;}
  db.ref("apks/"+id).update({appName:newName,description:newDesc,apkURL:newAPK,time:Date.now()});
  alert("Updated");
}