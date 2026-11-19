const candidates = [
  { name: "canon_r5_opt1", url: "https://images.unsplash.com/photo-1510127034890-ba27508e9f1c?w=800&auto=format&fit=crop&q=80" },
  { name: "canon_r5_opt2", url: "https://images.unsplash.com/photo-1581591524425-c7e0978865fc?w=800&auto=format&fit=crop&q=80" },
  { name: "dji_rs3_opt1", url: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=80" },
  { name: "dji_rs3_opt2", url: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800&auto=format&fit=crop&q=80" },
  { name: "zoom_h6_opt1", url: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&auto=format&fit=crop&q=80" },
  { name: "zoom_h6_opt2", url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80" },
  { name: "quest_3_opt1", url: "https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=800&auto=format&fit=crop&q=80" },
  { name: "quest_3_opt2", url: "https://images.unsplash.com/photo-1592478411213-6153e4ebc07d?w=800&auto=format&fit=crop&q=80" },
];

async function test() {
  for (const c of candidates) {
    const res = await fetch(c.url, { method: "HEAD" });
    console.log(`${c.name}: HTTP ${res.status}`);
  }
}

test();
