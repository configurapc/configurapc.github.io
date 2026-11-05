// Pruebas del reconocimiento de productos (feeds, capturas y CSV).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import '../assets/matcher.js';
const M = globalThis.PCMatch;
const db = JSON.parse(readFileSync(new URL('../data/components.json', import.meta.url)));
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok -', name); };

t('CSV con comillas, separadores distintos y comentarios', () => {
  const a = M.parseCsv('# comentario, con comas\nid;tienda;precio\n"gpu-x";pcc;"1.299,90"\n');
  assert.deepEqual(a[1], ['id', 'tienda', 'precio']);
  assert.equal(a[2][2], '1.299,90');
  const b = M.rowsToObjects(M.parseCsv('product_name\tsearch_price\tmerchant_deep_link\tin_stock\nRTX\t399.9\thttps://x\t0\n'));
  assert.equal(b[0].price, 399.9); assert.equal(b[0].inStock, false);
});
t('precios en formato español e inglés', () => {
  assert.equal(M.parsePrice('1.299,90 €'), 1299.9); assert.equal(M.parsePrice('1299.90'), 1299.9); assert.equal(M.parsePrice('89,95'), 89.95); assert.equal(M.parsePrice('gratis'), null);
});
t('no confunde modelos parecidos', () => {
  assert.equal(M.nameScore('Zotac RTX 5060 Ti Twin Edge 8GB', 'ASUS Dual RTX 5060 OC 8GB'), 0);
  assert.equal(M.nameScore('AMD Ryzen 7 7700', 'AMD Ryzen 7 7700X'), 0);
  assert.equal(M.nameScore('Radeon RX 9070 XT', 'Radeon RX 9070'), 0);
  assert.ok(M.nameScore('Tarjeta Gráfica Zotac GeForce RTX 5060 Ti Twin Edge 8GB GDDR7', 'Zotac GeForce RTX 5060 Ti Twin Edge OC 8GB') >= 0.75);
});
t('reconoce por enlace aunque lleve parámetros', () => {
  const m = M.matchRow(db.items, { name: 'x', url: 'https://www.pccomponentes.com/procesador-amd-ryzen-5-5500-3-6ghz-box/' });
  assert.equal(m.item.id, 'cpu-r5-5500'); assert.equal(m.how, 'url');
});
t('detecta tienda y categoría', () => {
  assert.equal(M.storeFromUrl('https://www.coolmod.com/x', db.stores), 'coolmod');
  assert.equal(M.storeFromName('PcComponentes ES', db.stores), 'pcc');
  assert.equal(M.guessCat('Tarjetas Gráficas Gigabyte RTX 5060'), 'gpu');
  assert.equal(M.guessCat('Portátil Lenovo LOQ RTX 5060'), 'laptop');
  assert.equal(M.guessCat('Lavadora Balay'), null);
});
console.log(`\n${n} pruebas OK`);
