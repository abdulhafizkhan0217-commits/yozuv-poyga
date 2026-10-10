(function(root){
const PROV=["Ko'p yashagan emas, ko'p ko'rgan biladi.","Oz-oz o'rganib dono bo'lur, qatra-qatra yig'ilib daryo bo'lur.","Birlashgan o'zar, birlashmagan to'zar.","Mehnat qilsang rohat ko'rarsan.","Yaxshi so'z jon ozig'i, yomon so'z bosh qozig'i.","Vaqt oltindan qimmat.","Do'st boshga kulfat tushganda bilinadi.","Ilm olish uchun avvalo sabr kerak.","Har bir yo'l birinchi qadamdan boshlanadi.","Bilimli kishi o'z yo'lini topadi."];
const LONG=["Toshkent O'zbekistonning poytaxti va eng katta shahri hisoblanadi. Bu yerda ko'plab tarixiy obidalar va zamonaviy binolar mavjud.","Kitob o'qish insonning bilimini oshiradi va fikrlash qobiliyatini kengaytiradi. Har kuni kamida yigirma daqiqa o'qishga odat qiling.","Mehnat qilgan odam hech qachon och qolmaydi. Sabr va qat'iyat bilan har qanday maqsadga erishish mumkin.","Samarqand va Buxoro dunyoning eng qadimiy shaharlaridan biri bo'lib, ularning me'morchiligi sayyohlarni lol qoldiradi."];
const pick=a=>a[Math.floor(Math.random()*a.length)];
function make(cat,avoid){let t;do{
  if(cat==="q")t=pick(PROV);else if(cat==="u")t=pick(LONG);
  else t=[...PROV].sort(()=>Math.random()-.5).slice(0,3).join(" ");
}while(t===avoid);return t}
const api={PROV,LONG,make};
if(typeof module!=="undefined")module.exports=api;else root.TEXTS=api;
})(this);
