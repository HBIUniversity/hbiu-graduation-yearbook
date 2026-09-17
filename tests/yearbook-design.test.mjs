import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBookletDesign, sameSource, designAssetPaths } from '../lib/yearbook-design.ts';
const book = 'f2944441-71cf-452d-86f5-f0e5ff4b617c';
const asset = `pages/${book}/11111111-1111-4111-8111-111111111111.png`;
const page = () => ({version:1,width:816,height:1056,source:{designId:'DAHSZVvMYqk',pageNumber:2,conversion:'layered'},background:{color:'#061a35',fit:'cover'},elements:[{id:'existing-title',kind:'text',x:55,y:90,width:700,height:80,rotation:0,opacity:1,text:'CLASS OF 2026',fontSize:56,fontFamily:'Georgia',color:'#d9b65c',bold:true,italic:false,align:'center',lineHeight:1.2},{id:'existing-photo',kind:'image',x:100,y:200,width:400,height:500,rotation:0,opacity:1,assetPath:asset,fit:'cover'}]});
test('preserves existing text, image identity, source page, background and geometry',()=>assert.deepEqual(validateBookletDesign(page(),book),page()));
test('source is independent of display ordering',()=>{const p=page();p.source.pageNumber=22;assert.equal(validateBookletDesign(p,book).source.pageNumber,22)});
test('unknown HTML/script fields are discarded',()=>{const p=page();p.elements[0].innerHTML='<script>alert(1)</script>';assert.equal(validateBookletDesign(p,book).elements[0].innerHTML,undefined)});
test('plain text is preserved, never converted to executable HTML',()=>{const p=page();p.elements[0].text='<script>alert(1)</script>';assert.equal(validateBookletDesign(p,book).elements[0].text,p.elements[0].text)});
for (const [name, mutate] of [
 ['flattened page cannot masquerade as layered',p=>p.source.conversion='flattened'],
 ['duplicate IDs rejected',p=>p.elements[1].id=p.elements[0].id],
 ['foreign booklet image rejected',p=>p.elements[1].assetPath='pages/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/11111111-1111-4111-8111-111111111111.png'],
 ['external image URL rejected',p=>p.elements[1].assetPath='https://example.com/private.png'],
 ['data URI rejected',p=>p.elements[1].assetPath='data:image/svg+xml,<svg/>'],
 ['path traversal rejected',p=>p.elements[1].assetPath=`pages/${book}/../photo.png`],
 ['executable CSS rejected',p=>p.elements[0].color='url(javascript:alert(1))'],
 ['nonfinite position rejected',p=>p.elements[0].x=NaN],
 ['negative dimensions rejected',p=>p.elements[0].width=-1],
 ['unsupported font rejected',p=>p.elements[0].fontFamily='url(https://x)'],
 ['excessive font size rejected',p=>p.elements[0].fontSize=501],
 ['fractional source page rejected',p=>p.source.pageNumber=2.5],
 ['unknown element rejected',p=>p.elements[0].kind='html'],
 ['huge page rejected',p=>p.width=100000],
 ['too many layers rejected',p=>p.elements=Array.from({length:501},(_,i)=>({...p.elements[0],id:`e-${i}`}))],
]) test(name,()=>{const p=page();mutate(p);assert.throws(()=>validateBookletDesign(p,book));});
test('empty intentional layered design allowed, not invented',()=>{const p=page();p.elements=[];assert.equal(validateBookletDesign(p,book).elements.length,0)});
test('source changes detected for save/import separation',()=>{const p=page(),q=page();q.source.pageNumber=3;assert.equal(sameSource(p,q),false)});
test('asset paths deduplicated',()=>{const p=page();p.background.assetPath=asset;assert.deepEqual(designAssetPaths(p),[asset])});
