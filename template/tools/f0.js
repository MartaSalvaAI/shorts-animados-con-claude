// Mide el tono (F0 mediano, Hz) de un wav: >165 Hz suele ser voz femenina, <140 masculina.
const fs=require('fs');
function f0(file){const b=fs.readFileSync(file);let p=12,data;while(p<b.length-8){const id=b.toString('ascii',p,p+4),sz=b.readUInt32LE(p+4);if(id==='data'){data=b.subarray(p+8,p+8+sz);break;}p+=8+sz+(sz&1);}
 const sr=44100,n=data.length/2,x=new Float32Array(n);for(let i=0;i<n;i++)x[i]=data.readInt16LE(i*2)/32768;
 const win=2048,res=[];for(let s=0;s+win<n;s+=4410){let e=0;for(let i=0;i<win;i++)e+=x[s+i]*x[s+i];if(e/win<0.002)continue;
  let best=0,bl=0;for(let lag=Math.floor(sr/400);lag<Math.floor(sr/70);lag++){let c=0;for(let i=0;i<win-lag;i+=2)c+=x[s+i]*x[s+i+lag];if(c>best){best=c;bl=lag;}}
  if(bl)res.push(sr/bl);}
 res.sort((a,b)=>a-b);return res.length?res[res.length>>1]:0;}
module.exports={f0}; if(require.main===module)for(const f of process.argv.slice(2))console.log(f,Math.round(f0(f)),'Hz');
