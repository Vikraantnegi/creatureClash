import { CATEGORIES, type CATEGORY, type SidePublic } from '@creature-clash/battle-engine';
import { View } from 'react-native';
import { Button } from '../../atoms/Button';
import { CATEGORY_LABEL } from '../constants';
import { score } from '../format';
export function CategoryPicker({
  side,
  disabled,
  choose,
}: {
  side: SidePublic;
  disabled: boolean;
  choose: (category: CATEGORY) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {CATEGORIES.map((category) => {
        const available = side.availableCategories.includes(category);
        return (
          <View key={category} className="w-[48%]">
            <Button
              testID={`choose-${category}`}
              label={`${CATEGORY_LABEL[category]} · ${available ? score(side.effectiveScores[category]) : 'spent'}`}
              disabled={disabled || !available}
              onPress={() => choose(category)}
            />
          </View>
        );
      })}
    </View>
  );
}
