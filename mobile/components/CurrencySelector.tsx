import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import tw from 'twrnc';
import { Currency } from '@/constants/type';
import { C, MONO } from '@/constants/theme';
import CurrencyIcon from './CurrencyIcon';

interface CurrencySelectorProps {
  currencies: Currency[];
  selectedCurrency: string;
  onCurrencyChange: (currency: string) => void;
  amount: string;
  onAmountChange: (amount: string) => void;
}

const { width, height } = Dimensions.get('window');

const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  currencies,
  selectedCurrency,
  onCurrencyChange,
  amount,
  onAmountChange,
}) => {
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCurrencies, setFilteredCurrencies] = useState(currencies);

  const selectedCurrencyData = currencies.find(
    (c) => c.code === selectedCurrency
  );

  useEffect(() => {
    const q = searchQuery.toLowerCase();
    setFilteredCurrencies(
      currencies.filter(
        (c) =>
          c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
      )
    );
  }, [searchQuery, currencies]);

  const closeModal = useCallback(() => {
    setIsDropdownVisible(false);
    setSearchQuery('');
  }, []);

  const renderCurrencyItem = ({ item }: { item: Currency }) => (
    <TouchableOpacity
      style={[tw`flex-row items-center px-4 py-3`, { borderBottomWidth: 1, borderBottomColor: C.line }]}
      onPress={() => {
        onCurrencyChange(item.code);
        closeModal();
      }}
    >
      <CurrencyIcon currency={item} size={34} />
      <View style={tw`ml-3 flex-1`}>
        <Text style={{ fontFamily: MONO, fontWeight: '700', color: C.text, fontSize: 14, letterSpacing: 0.4 }}>
          {item.code}
        </Text>
        <Text style={{ color: C.faint, fontSize: 12.5, marginTop: 1 }}>{item.name}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View
      style={[
        tw`rounded-2xl p-5`,
        { backgroundColor: C.panel, borderWidth: 1, borderColor: C.line },
      ]}
    >
      {/* label + base pill */}
      <View style={tw`flex-row items-center justify-between mb-4`}>
        <Text style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 2, color: C.faint }}>
          AMOUNT
        </Text>
        <TouchableOpacity
          style={[
            tw`flex-row items-center rounded-full`,
            { backgroundColor: C.raise, borderWidth: 1, borderColor: C.line2, paddingVertical: 6, paddingHorizontal: 12, paddingLeft: 6 },
          ]}
          onPress={() => setIsDropdownVisible(true)}
        >
          {selectedCurrencyData && <CurrencyIcon currency={selectedCurrencyData} size={22} />}
          <Text style={{ fontFamily: MONO, fontWeight: '600', color: C.text, fontSize: 13, marginLeft: 8, letterSpacing: 0.4 }}>
            {selectedCurrency}
          </Text>
          <Text style={{ color: C.blueBright, fontSize: 10, marginLeft: 6 }}>▾</Text>
        </TouchableOpacity>
      </View>

      {/* big amount */}
      <View style={tw`flex-row items-baseline`}>
        <Text style={{ fontFamily: MONO, fontSize: 22, fontWeight: '600', color: C.faint, marginRight: 8 }}>
          {selectedCurrencyData?.symbol ?? '$'}
        </Text>
        <TextInput
          style={{ flex: 1, fontFamily: MONO, fontSize: 40, fontWeight: '600', color: C.text, padding: 0 }}
          value={amount}
          onChangeText={onAmountChange}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={C.faint}
        />
      </View>

      {/* foot */}
      <View
        style={[
          tw`flex-row items-center justify-between mt-4 pt-3`,
          { borderTopWidth: 1, borderTopColor: C.line },
        ]}
      >
        <Text style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 0.4, color: C.faint, textTransform: 'uppercase' }}>
          Base ·{' '}
          <Text style={{ color: C.dim }}>{selectedCurrencyData?.name ?? '—'}</Text>
        </Text>
      </View>

      {/* picker modal */}
      <Modal visible={isDropdownVisible} transparent animationType="fade">
        <TouchableOpacity
          style={[tw`flex-1 justify-center items-center px-4`, { backgroundColor: 'rgba(9,12,17,0.6)' }]}
          activeOpacity={1}
          onPress={closeModal}
        >
          <View
            style={[
              tw`rounded-2xl`,
              { width: width * 0.92, maxHeight: height * 0.72, backgroundColor: C.panel2, borderWidth: 1, borderColor: C.line, overflow: 'hidden' },
            ]}
          >
            <View style={[tw`p-4`, { borderBottomWidth: 1, borderBottomColor: C.line }]}>
              <Text style={{ fontFamily: MONO, fontSize: 15, fontWeight: '700', color: C.text, letterSpacing: 0.4, marginBottom: 10 }}>
                SELECT BASE
              </Text>
              <TextInput
                style={[
                  { backgroundColor: C.bg, borderWidth: 1, borderColor: C.line2, color: C.text, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
                ]}
                placeholder="Search currencies"
                placeholderTextColor={C.faint}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <FlatList
              data={filteredCurrencies}
              renderItem={renderCurrencyItem}
              keyExtractor={(item) => item.id}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default CurrencySelector;
