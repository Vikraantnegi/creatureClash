export type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean;
  primary?: boolean;
  testID?: string;
};
