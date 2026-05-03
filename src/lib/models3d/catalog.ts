const MODELS_BY_SLUG: Record<string, string> = {
  'hendersonville-queen-murphy-cabinet-bed':
    'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/AntiqueCamera/glTF-Binary/AntiqueCamera.glb',
  'appalachian-full-horizontal-murphy-cabinet':
    'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/WaterBottle/glTF-Binary/WaterBottle.glb',
  'smoky-mountain-queen-bookcase-murphy':
    'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Suzanne/glTF-Binary/Suzanne.glb',
  'brevard-twin-cabinet-bed':
    'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/BoxAnimated/glTF-Binary/BoxAnimated.glb',
  'chimney-rock-queen-desk-murphy':
    'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
  'nantahala-full-storage-murphy':
    'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Lantern/glTF-Binary/Lantern.glb',
  'asheville-full-futon':
    'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/SheenChair/glTF-Binary/SheenChair.glb',
  'blue-ridge-queen-futon':
    'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/MaterialsVariantsShoe/glTF-Binary/MaterialsVariantsShoe.glb',
  'pisgah-twin-futon':
    'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/ToyCar/glTF-Binary/ToyCar.glb',
  'biltmore-loveseat':
    'https://raw.githubusercontent.com/nicferrier/glTF-Samples/main/Models/CesiumMilkTruck/glTF-Binary/CesiumMilkTruck.glb',
  'solid-hardwood-frame':
    'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/BoomBox/glTF-Binary/BoomBox.glb',
};

export function getGlbUrlByProductSlug(slug: string): string | null {
  return MODELS_BY_SLUG[slug] ?? null;
}
