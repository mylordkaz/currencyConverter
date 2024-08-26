import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import tw from 'twrnc';
import CurrencySelector from '@/components/CurrencySelector';
import CurrencyList from '@/components/CurrencyList';

export default function Index() {
  return (
    <LinearGradient
      colors={['#60A5FA', '#2563EB']} // Light blue to darker blue
      style={tw`flex-1`}
    >
      <View style={tw`flex-1 items-center p-4`}>
        <Text style={tw`text-4xl font-bold mb-8 text-center text-black`}>
          Tsukakan
        </Text>
        <CurrencySelector />
        <CurrencyList />
      </View>
    </LinearGradient>
  );
}
