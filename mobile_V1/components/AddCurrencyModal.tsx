import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  Dimensions,
} from 'react-native';
import tw from 'twrnc';
import { Currency } from '@/constants/type';

interface AddCurrencyModalProps {
  isVisible: boolean;
  onClose: () => void;
  onAddCurrency: (currency: Currency) => void;
  availableCurrencies: Currency[];
}

const { height: windowHeight } = Dimensions.get('window');
const MODAL_HEIGHT = windowHeight * 0.65;

const AddCurrencyModal: React.FC<AddCurrencyModalProps> = ({
  isVisible,
  onClose,
  onAddCurrency,
  availableCurrencies,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isVisible) {
      setSearchQuery('');
    }
  }, [isVisible]);

  const filteredCurrencies = availableCurrencies.filter(
    (currency) =>
      currency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      currency.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderCurrencyItem = ({ item }: { item: Currency }) => (
    <TouchableOpacity
      style={tw`flex-row items-center p-3 border-b border-gray-200`}
      onPress={() => {
        onAddCurrency(item);
        onClose();
      }}
    >
      {item.type === 'crypto' ? (
        <Image source={{ uri: item.flag }} style={tw`w-6 h-6 mr-3`} />
      ) : (
        <Text style={tw`text-2xl mr-3`}>{item.flag}</Text>
      )}
      <Text style={tw`text-lg`}>
        {item.name} ({item.code})
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={isVisible} animationType="slide" transparent>
      <View style={tw`flex-1 justify-end `}>
        <TouchableOpacity style={tw`flex-1`} onPress={onClose} />
        <View
          style={tw.style('bg-white rounded-t-3xl', { height: MODAL_HEIGHT })}
        >
          <View
            style={tw`w-10 h-1 bg-gray-300 rounded-full mx-auto mt-2 mb-2`}
          />
          <View style={tw`p-4 border-b border-gray-200`}>
            <Text style={tw`text-2xl font-bold mb-2`}>Add Currency</Text>
            <TextInput
              style={tw`bg-gray-100 p-2 rounded`}
              placeholder="Search currencies..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <FlatList
            data={filteredCurrencies}
            renderItem={renderCurrencyItem}
            keyExtractor={(item) => item.code}
          />
        </View>
      </View>
    </Modal>
  );
};

export default AddCurrencyModal;
