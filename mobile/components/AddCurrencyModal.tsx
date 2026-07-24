import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Dimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import tw from 'twrnc';
import { Currency } from '@/constants/type';
import { C, MONO } from '@/constants/theme';
import CurrencyIcon from './CurrencyIcon';

interface AddCurrencyModalProps {
  isVisible: boolean;
  onClose: () => void;
  onAddCurrency: (currency: Currency) => void;
  availableCurrencies: Currency[];
}

const { height: windowHeight } = Dimensions.get('window');
const MODAL_HEIGHT = windowHeight * 0.7;

const AddCurrencyModal: React.FC<AddCurrencyModalProps> = ({
  isVisible,
  onClose,
  onAddCurrency,
  availableCurrencies,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (!isVisible) setSearchQuery('');
    else translateY.value = 0;
  }, [isVisible]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY > MODAL_HEIGHT * 0.25 || e.velocityY > 800) {
        translateY.value = withTiming(MODAL_HEIGHT, { duration: 200 }, () => {
          runOnJS(onClose)();
        });
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const filteredCurrencies = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return availableCurrencies.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [availableCurrencies, searchQuery]);

  const fiatCount = availableCurrencies.filter((c) => c.type === 'fiat').length;
  const cryptoCount = availableCurrencies.length - fiatCount;

  const renderCurrencyItem = ({ item }: { item: Currency }) => (
    <TouchableOpacity
      style={[tw`flex-row items-center px-1`, { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.line }]}
      onPress={() => {
        onAddCurrency(item);
        onClose();
      }}
    >
      <CurrencyIcon currency={item} size={40} />
      <View style={tw`ml-3 flex-1`}>
        <Text style={{ fontFamily: MONO, fontWeight: '700', color: C.text, fontSize: 14, letterSpacing: 0.4 }}>{item.code}</Text>
        <Text style={{ color: C.faint, fontSize: 12.5, marginTop: 1 }} numberOfLines={1}>{item.name}</Text>
      </View>
      <View style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: C.blueLine, backgroundColor: C.blueSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: MONO, fontSize: 17, color: C.blueBright, lineHeight: 20 }}>+</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal visible={isVisible} animationType="slide" transparent>
      <View style={[tw`flex-1 justify-end`, { backgroundColor: 'rgba(9,12,17,0.5)' }]}>
        <TouchableOpacity style={tw`flex-1`} activeOpacity={1} onPress={onClose} />
        <Animated.View
          style={[
            tw`px-5 pb-5`,
            { height: MODAL_HEIGHT, backgroundColor: C.panel2, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, borderColor: C.line },
            sheetStyle,
          ]}
        >
          <GestureDetector gesture={panGesture}>
            <View style={{ paddingBottom: 4 }}>
              <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: C.line2, alignSelf: 'center', marginTop: 8, marginBottom: 16 }} />
              <Text style={{ fontFamily: MONO, fontSize: 17, fontWeight: '700', color: C.text, letterSpacing: 0.6 }}>ADD CURRENCY</Text>
              <Text style={{ fontFamily: MONO, fontSize: 11, color: C.faint, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 4, marginBottom: 16 }}>
                {fiatCount} fiat · {cryptoCount} coins
              </Text>
            </View>
          </GestureDetector>
          <TextInput
            style={{ backgroundColor: C.bg, borderWidth: 1, borderColor: C.line2, color: C.text, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginBottom: 8 }}
            placeholder="Search currencies…"
            placeholderTextColor={C.faint}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <FlatList
            data={filteredCurrencies}
            renderItem={renderCurrencyItem}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
          />
        </Animated.View>
      </View>
    </Modal>
  );
};

export default AddCurrencyModal;
