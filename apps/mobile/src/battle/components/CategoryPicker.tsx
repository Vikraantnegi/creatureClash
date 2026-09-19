import { CATEGORIES, type CATEGORY, type SidePublic } from '@creature-clash/battle-engine';
import { Pressable, Text, View } from 'react-native';
import { Button } from '../../atoms/Button';
import { CATEGORY_LABEL } from '../constants';
import { score } from '../format';
import type { CreatureSheetView } from '../types';
import { useCategoryDraft } from '../useCategoryDraft';
export function CategoryPicker({
  side,
  opponent,
  disabled,
  choose,
}: {
  side: SidePublic;
  opponent: CreatureSheetView;
  disabled: boolean;
  choose: (category: CATEGORY) => void;
}) {
  const { draft, select } = useCategoryDraft();
  return (
    <View className="gap-2">
      <View className="flex-row justify-between px-3">
        <Text className="text-muted font-mono text-xs">CATEGORY · YOUR VALUE</Text>
        <Text className="text-muted font-mono text-xs">OPPONENT CLUE / PLAYED</Text>
      </View>
      {CATEGORIES.map((category) => {
        const available = side.availableCategories.includes(category),
          selected = draft === category;
        const row = opponent.categories.find((c) => c.category === category)!;
        return (
          <Pressable
            key={category}
            testID={`choose-${category}`}
            accessibilityRole="button"
            accessibilityLabel={`${CATEGORY_LABEL[category]}, yours ${score(side.effectiveScores[category])}, opponent ${row.effective}${row.spent ? ', opponent spent' : ''}`}
            accessibilityState={{ disabled: disabled || !available, selected }}
            disabled={disabled || !available}
            onPress={() => select(category)}
            className={`min-h-12 flex-row items-center justify-between gap-2 rounded-xl border px-3 py-2 ${selected ? 'border-ink bg-ink' : 'border-line bg-card'}`}
          >
            <View className="flex-1">
              <Text
                className={`font-sans text-sm font-bold ${selected ? 'text-white' : 'text-ink'} ${!available ? 'line-through' : ''}`}
              >
                {CATEGORY_LABEL[category]}
              </Text>
              {!available && (
                <Text className="text-muted font-sans text-xs">Your category spent</Text>
              )}
            </View>
            <Text className={`font-mono text-lg font-bold ${selected ? 'text-white' : 'text-ink'}`}>
              {score(side.effectiveScores[category])}
            </Text>
            <View className="w-28 items-end">
              <Text
                className={`text-right font-sans text-xs ${selected ? 'text-white' : 'text-muted'}`}
              >
                {row.effective}
              </Text>
              <Text
                className={`text-right font-sans text-xs ${selected ? 'text-white' : 'text-muted'}`}
              >
                {row.spent ? 'Spent · revealed' : 'Unplayed'}
              </Text>
            </View>
          </Pressable>
        );
      })}
      <Button
        testID="lock-category"
        primary
        label={draft ? `Lock in ${CATEGORY_LABEL[draft]}` : 'Select a category to lock in'}
        disabled={disabled || !draft}
        onPress={() => {
          if (draft) choose(draft);
        }}
      />
      <Text className="text-muted font-sans text-xs">
        Selection stays editable until locked. The clock keeps running.
      </Text>
    </View>
  );
}
