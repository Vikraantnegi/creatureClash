import { Canvas, ImageSVG, Skia } from '@shopify/react-native-skia';
import { View } from 'react-native';
import { creatureName } from '@creature-clash/battle-fixtures';
import art from './art.json';
type Mood = 'neutral' | 'confident' | 'defeated';
const sprites = Object.fromEntries(
  Object.entries(art).map(([id, poses]) => [
    id,
    Object.fromEntries(
      Object.entries(poses).map(([mood, xml]) => [mood, Skia.SVG.MakeFromString(xml)]),
    ),
  ]),
);
export function CreatureArt({
  speciesId,
  size = 112,
  mood = 'neutral',
  mirror = false,
}: {
  speciesId: string;
  size?: number;
  mood?: Mood;
  mirror?: boolean;
}) {
  const svg = sprites[speciesId]?.[mood];
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${creatureName(speciesId)}, ${mood}`}
      style={{ width: size, height: size, transform: [{ scaleX: mirror ? -1 : 1 }] }}
    >
      {svg && (
        <Canvas style={{ width: size, height: size }}>
          <ImageSVG svg={svg} x={0} y={0} width={size} height={size} />
        </Canvas>
      )}
    </View>
  );
}
