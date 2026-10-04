// Package and XML helpers shared by the designer and the generator.
// The generator here is the JavaScript stand-in for the Apex generator: every operation is a surgical edit of
// existing parts (never a re-serialisation of a renderer model), so it maps one-to-one onto Apex
// with Compression.ZipReader/ZipWriter and an XML scanner.

export const NS = {
  p: 'http://schemas.openxmlformats.org/presentationml/2006/main',
  a: 'http://schemas.openxmlformats.org/drawingml/2006/main',
  r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  c: 'http://schemas.openxmlformats.org/drawingml/2006/chart',
  rel: 'http://schemas.openxmlformats.org/package/2006/relationships',
  ct: 'http://schemas.openxmlformats.org/package/2006/content-types'
};

export const REL = {
  slide: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide',
  image: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image',
  chart: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart',
  notesSlide: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide',
  package: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/package'
};

export const CT = {
  slide: 'application/vnd.openxmlformats-officedocument.presentationml.slide+xml',
  chart: 'application/vnd.openxmlformats-officedocument.drawingml.chart+xml',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  png: 'image/png', jpeg: 'image/jpeg', gif: 'image/gif'
};

const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

/* ------------------------------------------------------------------ XML */
let DOMParserImpl = globalThis.DOMParser;
let XMLSerializerImpl = globalThis.XMLSerializer;
/** Node tests pass @xmldom/xmldom here; browsers use their own. */
export function setXmlImpl(parser, serializer) { DOMParserImpl = parser; XMLSerializerImpl = serializer; }

export function parseXml(str) { return new DOMParserImpl().parseFromString(str, 'application/xml'); }
export function serializeXml(doc) {
  let s = new XMLSerializerImpl().serializeToString(doc);
  s = s.replace(/^<\?xml[^>]*\?>\s*/, '');
  return XML_DECL + s;
}

/** Direct element children, optionally filtered by namespace + local name. */
export function kids(el, ns, local) {
  const out = [];
  for (let n = el && el.firstChild; n; n = n.nextSibling) {
    if (n.nodeType === 1 && (!local || (n.localName === local && n.namespaceURI === ns))) out.push(n);
  }
  return out;
}
export function kid(el, ns, local) { return kids(el, ns, local)[0] || null; }
/** First descendant by path of [ns, local] pairs, following direct children. */
export function path(el, ...steps) {
  let cur = el;
  for (const [ns, local] of steps) { cur = kid(cur, ns, local); if (!cur) return null; }
  return cur;
}
export function desc(el, ns, local) { return Array.from(el.getElementsByTagNameNS(ns, local)); }
export function attr(el, name) { return el ? el.getAttribute(name) : null; }

/** Shapes in a slide's spTree that carry a cNvPr id: sp, pic, graphicFrame, grpSp, cxnSp (group children included). */
export function shapeElements(slideDoc) {
  const tree = path(slideDoc.documentElement, [NS.p, 'cSld'], [NS.p, 'spTree']);
  const out = [];
  const walk = (parent) => {
    for (const el of kids(parent)) {
      if (el.namespaceURI !== NS.p) continue;
      if (['sp', 'pic', 'graphicFrame', 'grpSp', 'cxnSp'].includes(el.localName)) {
        out.push(el);
        if (el.localName === 'grpSp') walk(el);
      }
    }
  };
  if (tree) walk(tree);
  return out;
}
export function cNvPr(shapeEl) {
  for (const nv of kids(shapeEl)) {
    if (nv.localName.startsWith('nv')) { const c = kid(nv, NS.p, 'cNvPr'); if (c) return c; }
  }
  return null;
}
export function shapeById(slideDoc, id) {
  return shapeElements(slideDoc).find((el) => attr(cNvPr(el), 'id') === String(id)) || null;
}
/**
 * Give every shape on a slide a unique cNvPr id, as PowerPoint does when it saves. Some generators and copy-paste
 * paths write duplicates; bindings are keyed by id, so the designer repairs them once, on upload.
 */
export function fixDuplicateIds(slideDoc) {
  const els = shapeElements(slideDoc).map(cNvPr).filter(Boolean);
  const nv = path(slideDoc.documentElement, [NS.p, 'cSld'], [NS.p, 'spTree'], [NS.p, 'nvGrpSpPr'], [NS.p, 'cNvPr']);
  if (nv) els.unshift(nv);
  let max = Math.max(0, ...els.map((e) => +attr(e, 'id') || 0));
  const seen = new Set();
  let fixed = 0;
  for (const e of els) {
    const id = attr(e, 'id');
    if (seen.has(id)) { e.setAttribute('id', String(++max)); fixed++; }
    seen.add(attr(e, 'id'));
  }
  return fixed;
}

export function shapeKind(el) {
  if (el.localName === 'pic') return 'picture';
  if (el.localName === 'grpSp') return 'group';
  if (el.localName === 'graphicFrame') {
    const gd = desc(el, NS.a, 'graphicData')[0];
    const uri = attr(gd, 'uri') || '';
    if (uri.endsWith('/table')) return 'table';
    if (uri.endsWith('/chart')) return 'chart';
    return 'frame';
  }
  return kid(el, NS.p, 'txBody') ? 'text' : 'shape';
}

/* ------------------------------------------------------------------ package */
export function relsPathFor(part) {
  const i = part.lastIndexOf('/');
  return part.slice(0, i + 1) + '_rels/' + part.slice(i + 1) + '.rels';
}
export function resolveTarget(fromPart, target) {
  if (target.startsWith('/')) return target.slice(1);
  const parts = fromPart.split('/'); parts.pop();
  for (const seg of target.split('/')) {
    if (seg === '..') parts.pop(); else if (seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}
export function relativeTarget(fromPart, toPart) {
  const from = fromPart.split('/'); from.pop();
  const to = toPart.split('/');
  let i = 0; while (i < from.length && i < to.length - 1 && from[i] === to[i]) i++;
  return '../'.repeat(from.length - i) + to.slice(i).join('/');
}

export class Pkg {
  static async load(bytes, JSZip) {
    const zip = await JSZip.loadAsync(bytes);
    return new Pkg(zip);
  }
  constructor(zip) { this.zip = zip; this.docs = new Map(); }

  has(part) { return !!this.zip.file(part); }
  list(prefix) { return Object.keys(this.zip.files).filter((n) => n.startsWith(prefix) && !this.zip.files[n].dir); }
  async text(part) { const f = this.zip.file(part); return f ? f.async('string') : null; }
  async bytes(part) { const f = this.zip.file(part); return f ? f.async('uint8array') : null; }
  async doc(part) {
    if (!this.docs.has(part)) {
      const s = await this.text(part);
      if (s == null) return null;
      this.docs.set(part, parseXml(s));
    }
    return this.docs.get(part);
  }
  putDoc(part, doc) { this.docs.set(part, doc); }
  putText(part, text) { this.docs.delete(part); this.zip.file(part, text); }
  putBytes(part, bytes) { this.docs.delete(part); this.zip.file(part, bytes); }
  remove(part) { this.docs.delete(part); this.zip.remove(part); }
  flush() { for (const [part, doc] of this.docs) this.zip.file(part, serializeXml(doc)); }
  async save() {
    this.flush();
    return this.zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  }

  /* relationships */
  async rels(part, create) {
    const rp = relsPathFor(part);
    let d = await this.doc(rp);
    if (!d && create) { d = parseXml(`<Relationships xmlns="${NS.rel}"/>`); this.putDoc(rp, d); }
    return d;
  }
  async relList(part) {
    const d = await this.rels(part);
    if (!d) return [];
    return kids(d.documentElement).map((r) => ({
      id: attr(r, 'Id'), type: attr(r, 'Type'), target: attr(r, 'Target'), external: attr(r, 'TargetMode') === 'External',
      part: attr(r, 'TargetMode') === 'External' ? null : resolveTarget(part, attr(r, 'Target')), el: r
    }));
  }
  async relTarget(part, rId) { return (await this.relList(part)).find((r) => r.id === rId) || null; }
  async addRel(part, type, toPart) {
    const d = await this.rels(part, true);
    const used = new Set(kids(d.documentElement).map((r) => attr(r, 'Id')));
    let n = used.size + 1; while (used.has('rId' + n)) n++;
    const r = d.createElementNS(NS.rel, 'Relationship');
    r.setAttribute('Id', 'rId' + n); r.setAttribute('Type', type); r.setAttribute('Target', relativeTarget(part, toPart));
    d.documentElement.appendChild(r);
    return 'rId' + n;
  }

  /* content types */
  async setOverride(part, contentType) {
    const d = await this.doc('[Content_Types].xml');
    const name = '/' + part;
    let o = kids(d.documentElement, NS.ct, 'Override').find((e) => attr(e, 'PartName') === name);
    if (!o) { o = d.createElementNS(NS.ct, 'Override'); o.setAttribute('PartName', name); d.documentElement.appendChild(o); }
    o.setAttribute('ContentType', contentType);
  }
  async removeOverride(part) {
    const d = await this.doc('[Content_Types].xml');
    const o = kids(d.documentElement, NS.ct, 'Override').find((e) => attr(e, 'PartName') === '/' + part);
    if (o) o.parentNode.removeChild(o);
  }
  async ensureDefault(ext, contentType) {
    const d = await this.doc('[Content_Types].xml');
    if (kids(d.documentElement, NS.ct, 'Default').some((e) => (attr(e, 'Extension') || '').toLowerCase() === ext)) return;
    const e = d.createElementNS(NS.ct, 'Default'); e.setAttribute('Extension', ext); e.setAttribute('ContentType', contentType);
    d.documentElement.insertBefore(e, d.documentElement.firstChild);
  }
  /** Next free part name like ppt/slides/slide8.xml. */
  nextPartName(dir, stem, ext) {
    let n = 1; while (this.has(`${dir}/${stem}${n}.${ext}`)) n++;
    return `${dir}/${stem}${n}.${ext}`;
  }

  /* presentation */
  /** Slides in show order: [{ sldId, rId, part }]. sldId is stable across PowerPoint saves; part names are not. */
  async slides() {
    const pres = await this.doc('ppt/presentation.xml');
    const lst = path(pres.documentElement, [NS.p, 'sldIdLst']);
    const rels = await this.relList('ppt/presentation.xml');
    return kids(lst, NS.p, 'sldId').map((s) => {
      const rId = s.getAttributeNS(NS.r, 'id');
      return { sldId: attr(s, 'id'), rId, part: rels.find((r) => r.id === rId).part, el: s };
    });
  }
}

/* ------------------------------------------------------------------ images */
/** Pixel size and type from PNG/JPEG/GIF headers (the Apex version reads the same bytes: OxImageInfo). */
export function imageInfo(bytes) {
  const b = bytes;
  if (b[0] === 0x89 && b[1] === 0x50) {
    return { ext: 'png', type: CT.png, w: (b[16] << 24 | b[17] << 16 | b[18] << 8 | b[19]) >>> 0, h: (b[20] << 24 | b[21] << 16 | b[22] << 8 | b[23]) >>> 0 };
  }
  if (b[0] === 0x47 && b[1] === 0x49) return { ext: 'gif', type: CT.gif, w: b[6] | b[7] << 8, h: b[8] | b[9] << 8 };
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1]; const len = b[i + 2] << 8 | b[i + 3];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        return { ext: 'jpeg', type: CT.jpeg, h: b[i + 5] << 8 | b[i + 6], w: b[i + 7] << 8 | b[i + 8] };
      }
      i += 2 + len;
    }
  }
  return null;
}

export function base64ToBytes(b64) {
  if (typeof atob === 'function') { const s = atob(b64); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
  return new Uint8Array(Buffer.from(b64, 'base64'));
}
