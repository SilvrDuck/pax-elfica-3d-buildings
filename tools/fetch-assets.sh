#!/usr/bin/env bash
# Downloads the CC0 low-poly packs into vendor/ (never committed, never copied wholesale).
# tools/pick-assets.mjs then copies only the pieces listed in src/data/props.json into public/assets/.
set -uo pipefail
cd "$(dirname "$0")/.."
mkdir -p vendor
cd vendor

clone() {
  local url=$1
  local dir=$2
  if [ -d "$dir" ]; then echo "have $dir"; return; fi
  git clone --depth 1 --quiet "$url" "$dir" && echo "cloned $dir" || echo "FAILED clone $url"
}

# Kenney's download links carry a content hash; read them off the asset page.
kenney() {
  local kit=$1
  local dir="kenney-$kit"
  if [ -d "$dir" ]; then echo "have $dir"; return; fi
  local page url
  page=$(curl -fsL "https://kenney.nl/assets/$kit") || { echo "FAILED page kenney $kit"; return; }
  url=$(printf '%s' "$page" | grep -o 'https://kenney.nl/media/pages/assets/[^"]*\.zip' | head -1)
  if [ -z "$url" ]; then echo "FAILED no zip link for kenney $kit"; return; fi
  mkdir -p "$dir"
  if curl -fsL "$url" -o "$dir.zip" && unzip -q -o "$dir.zip" -d "$dir"; then
    rm -f "$dir.zip"; echo "fetched $dir"
  else
    rm -rf "$dir" "$dir.zip"; echo "FAILED download kenney $kit ($url)"
  fi
}

clone https://github.com/KayKit-Game-Assets/KayKit-Furniture-Bits-1.0 kaykit-furniture
clone https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0 kaykit-dungeon
kenney furniture-kit
kenney fantasy-town-kit
kenney castle-kit
kenney survival-kit
kenney graveyard-kit

if [ ! -d quaternius-village ]; then
  cat <<'EOF'
Quaternius Medieval Village MegaKit is a manual download (name your own price, CC0):
  https://quaternius.itch.io/medieval-village-megakit
Unzip the Standard pack into vendor/quaternius-village/ so that its glTF folder sits inside.
EOF
fi
