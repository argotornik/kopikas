// Coins and marks drawn by a build become instances of their Parts (page 2:46), so a Part edited
// there reaches every frame. Each keeps its place, turn, size and, for a mark, its colour. The coin's
// variant is read off the drawing: its metal from the face colour, its mood from where the face's
// features sit. The header's coin is named Logo by the screen build and stays drawn: the app always
// draws the brand mark with the same wobble. Rolls and bars stay drawn too: each one's height is its amount, and the inside of an
// instance can't be resized. Appended to the stage and screen builds (gen-calls.mjs), it works on the
// frames they made; on its own (gen-calls.mjs instances) it works on FRAME_IDS.
{
  const partsPage = await figma.getNodeByIdAsync("2:46");
  await partsPage.loadAsync();
  const set = (name) => partsPage.children.find((n) => n.type === "COMPONENT_SET" && n.name === name);
  const coinSet = set("Coin"), markSet = set("Mark");
  const variant = (s, props) => s.children.find((c) => Object.entries(props).every(([k, v]) => c.variantProperties[k] === v));
  const hex = (p) => (p && p.type === "SOLID" ? ["r", "g", "b"].map((k) => Math.round(p.color[k] * 255).toString(16).padStart(2, "0")).join("") : "");
  const rgbOf = (h) => [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  // A coin is two groups: the metal (rim, face, ring) and the face's features.
  const faceColour = (coin) => hex(coin.children[0]?.children?.[1]?.fills?.[0]);
  // Measured in the coin's own space (inside a group, x and y are the coin's), so a turned coin reads the same.
  const features = (coin) => (coin.children[1]?.findAll((n) => n.type === "VECTOR") || []).map((v) => [v.x, v.y, v.width, v.height].map((x) => x / coin.width));
  const featureGap = (a, b) => (a.length !== b.length ? Infinity : a.reduce((s, p, i) => s + p.reduce((q, x, j) => q + Math.abs(x - b[i][j]), 0), 0));
  const coinVariants = coinSet.children.map((c) => ({ c, colour: faceColour(c), features: features(c) }));
  const colourGap = (a, b) => rgbOf(a).reduce((s, x, i) => s + Math.abs(x - rgbOf(b)[i]), 0);
  const swap = (copy, comp, scale = copy.width / comp.width) => {
    const inst = comp.createInstance();
    if (Math.abs(scale - 1) > 0.01) inst.rescale(scale);
    const parent = copy.parent;
    parent.insertChild(parent.children.indexOf(copy), inst);
    inst.relativeTransform = copy.relativeTransform;
    inst.name = copy.name;
    copy.remove();
    return inst;
  };
  const frames = typeof FRAME_IDS !== "undefined" ? FRAME_IDS : [...(result.results || []), ...(result.screens || [])].map((r) => r.frame);
  const report = [];
  for (const id of frames) {
    const frame = await figma.getNodeByIdAsync(id);
    if (!frame) { report.push({ frame: id, missing: true }); continue; }
    const done = { frame: frame.name, coins: [], marks: 0, squigglesRedrawn: 0 };
    for (const copy of frame.findAll((n) => n.type === "FRAME" && n.name === "Coin")) {
      const colour = faceColour(copy), mine = features(copy);
      const best = coinVariants
        .map((v) => ({ ...v, score: colourGap(colour || v.colour, v.colour) / 255 + featureGap(mine, v.features) * 10 }))
        .sort((a, b) => a.score - b.score)[0];
      swap(copy, best.c);
      done.coins.push(`${best.c.name} (${best.score.toFixed(2)})`);
    }
    for (const copy of frame.findAll((n) => n.type === "FRAME" && n.name.startsWith("Mark · "))) {
      const kind = copy.name === "Mark · dot" ? "Dot" : "Squiggle";
      const drawn = copy.findOne((n) => n.type === "VECTOR");
      const comp = variant(markSet, { Kind: kind }), shape = comp.findOne((n) => n.type === "VECTOR");
      if (kind === "Squiggle" && JSON.stringify(drawn.vectorPaths) !== JSON.stringify(shape.vectorPaths)) done.squigglesRedrawn++;
      // A mark matches its drawn shape, not its frame: a dot in a tighter frame keeps its size. Its look is
      // read before the swap, which removes it.
      const was = drawn.absoluteBoundingBox;
      const look = { fills: drawn.fills, strokes: drawn.strokes, strokeWeight: drawn.strokeWeight, strokeCap: drawn.strokeCap, strokeJoin: drawn.strokeJoin };
      const inst = swap(copy, comp, drawn.width / shape.width);
      const part = inst.findOne((n) => n.type === "VECTOR"), now = part.absoluteBoundingBox;
      inst.x += was.x + was.width / 2 - (now.x + now.width / 2);
      inst.y += was.y + was.height / 2 - (now.y + now.height / 2);
      part.fills = look.fills;
      part.strokes = look.strokes;
      if (look.strokes.length) Object.assign(part, { strokeWeight: look.strokeWeight, strokeCap: look.strokeCap, strokeJoin: look.strokeJoin });
      done.marks++;
    }
    report.push(done);
  }
  result.instances = report;
}
