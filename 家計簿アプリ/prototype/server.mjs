import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('.', import.meta.url));
const port=Number(process.argv[2]||4173);
http.createServer(async(req,res)=>{
  try {
    const name = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file = path.resolve(root, '.'+(name==='/'?'/index.html':name));
    if (!file.startsWith(root) || !['.html','.js','.css','.svg'].includes(path.extname(file))) {res.writeHead(404).end();return;}
    const data = await readFile(file);
    res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'})[path.extname(file)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(data);
  } catch {res.writeHead(404).end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Local: http://localhost:${port}`));
