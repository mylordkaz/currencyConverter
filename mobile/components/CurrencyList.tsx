import {
  View,
  Text,
  ActivityIndicator,
  Image,
  TouchableOpacity,
} from 'react-native';
import { RectButton } from 'react-native-gesture-handler';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import tw from 'twrnc';
import { Currency } from '@/constants/type';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import ReorderableList, {
  ReorderableListReorderEvent,
  reorderItems,
  useIsActive,
  useReorderableDrag,
} from 'react-native-reorderable-list';
import { convertCurrency, formatAmount, getDescription } from '@/lib/currency';

interface CurrencyListProps {
  currencies: Currency[];
  selectedCurrencyCodes: string[];
  baseCurrency: string;
  baseAmount: number;
  isLoading: boolean;
  fiatError: string | null;
  cryptoError: string | null;
  onRemoveCurrency: (currencyCode: string) => void;
  onReorderCurrencies: (newOrder: string[]) => void;
}

/** A selected code paired with its live currency data (null => unresolved). */
interface CurrencyRow {
  code: string;
  currency: Currency | null;
}

const rowKey = (row: CurrencyRow): string =>
  row.currency ? row.currency.id : `missing-${row.code}`;

const CurrencyRowItem = ({
  row,
  baseCurrencyData,
  baseAmount,
  onRemove,
}: {
  row: CurrencyRow;
  baseCurrencyData: Currency;
  baseAmount: number;
  onRemove: (code: string) => void;
}) => {
  const drag = useReorderableDrag();
  const isActive = useIsActive();

  const renderRightActions = () => (
    <RectButton
      style={tw`bg-red-500 rounded-3xl justify-center items-center p-4`}
      onPress={() => onRemove(row.code)}
    >
      <Ionicons name="trash-outline" size={24} color="white" />
    </RectButton>
  );

  // Saved code with no live match (e.g. crypto dropped out of the CMC top 100):
  // muted "rate unavailable" row, still swipe-to-delete-able.
  if (!row.currency) {
    return (
      <ReanimatedSwipeable renderRightActions={renderRightActions}>
        <View
          style={tw`flex-row items-center justify-between py-3 border-b border-gray-100 bg-white`}
        >
          <View style={tw`flex-row items-center`}>
            <Text style={tw`mr-2 text-lg`}>🏳️</Text>
            <Text style={tw`font-semibold text-gray-400`}>{row.code}</Text>
          </View>
          <Text style={tw`text-xs text-gray-400`}>rate unavailable</Text>
        </View>
      </ReanimatedSwipeable>
    );
  }

  const currency = row.currency;
  const convertedAmount = convertCurrency(baseAmount, baseCurrencyData, currency);

  return (
    <ReanimatedSwipeable renderRightActions={renderRightActions}>
      <TouchableOpacity
        style={[
          tw`flex-row items-center justify-between py-3 border-b border-gray-100`,
          isActive ? tw`bg-gray-200` : tw`bg-white`,
        ]}
        onLongPress={drag}
      >
        <View style={tw`flex-row items-center`}>
          {currency.type === 'crypto' ? (
            <Image source={{ uri: currency.flag }} style={tw`w-6 h-6 mr-2`} />
          ) : (
            <Text style={tw`mr-2 text-lg`}>{currency.flag}</Text>
          )}
          <Text style={tw`font-semibold`}>{currency.code}</Text>
        </View>
        <View style={tw`items-end`}>
          <Text style={tw`font-semibold`}>
            {currency.symbol}
            {convertedAmount !== null ? formatAmount(convertedAmount) : '0.00'}
          </Text>
          <Text style={tw`text-xs text-gray-500`}>
            {getDescription(currency, baseCurrencyData)}
          </Text>
        </View>
      </TouchableOpacity>
    </ReanimatedSwipeable>
  );
};

const CurrencyList: React.FC<CurrencyListProps> = ({
  currencies,
  selectedCurrencyCodes,
  baseCurrency,
  baseAmount,
  isLoading,
  fiatError,
  cryptoError,
  onRemoveCurrency,
  onReorderCurrencies,
}) => {
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const rows = useMemo<CurrencyRow[]>(
    () =>
      selectedCurrencyCodes.map((code) => ({
        code,
        currency: currencies.find((c) => c.code === code) ?? null,
      })),
    [currencies, selectedCurrencyCodes]
  );

  const baseCurrencyData = useMemo(
    () => currencies.find((c) => c.code === baseCurrency) ?? null,
    [currencies, baseCurrency]
  );

  const handleReorder = ({ from, to }: ReorderableListReorderEvent) => {
    onReorderCurrencies(reorderItems(selectedCurrencyCodes, from, to));
  };

  if (isLoading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  // Full error state only when both sources failed and there is nothing to show.
  if (fiatError && cryptoError && currencies.length === 0) {
    return (
      <View style={tw`bg-white rounded-3xl p-6 flex-1`}>
        <Text style={tw`text-2xl font-bold mb-4`}>My currencies</Text>
        <Text style={tw`text-red-500`}>{fiatError}</Text>
        <Text style={tw`text-red-500 mt-1`}>{cryptoError}</Text>
      </View>
    );
  }

  const activeError = fiatError ?? cryptoError;

  return (
    <View style={tw`bg-white rounded-3xl p-6 flex-1`}>
      <Text style={tw`text-2xl font-bold mb-4`}>My currencies</Text>

      {activeError && !bannerDismissed && (
        <View
          style={tw`flex-row items-center justify-between bg-red-100 rounded-xl p-3 mb-3`}
        >
          <Text style={tw`text-red-600 flex-1 mr-2`}>{activeError}</Text>
          <TouchableOpacity
            onPress={() => setBannerDismissed(true)}
            hitSlop={8}
          >
            <Ionicons name="close" size={20} color="#dc2626" />
          </TouchableOpacity>
        </View>
      )}

      {!baseCurrencyData ? (
        <Text style={tw`text-red-500`}>Base currency not found</Text>
      ) : (
        <ReorderableList
          data={rows}
          onReorder={handleReorder}
          keyExtractor={rowKey}
          renderItem={({ item }) => (
            <CurrencyRowItem
              row={item}
              baseCurrencyData={baseCurrencyData}
              baseAmount={baseAmount}
              onRemove={onRemoveCurrency}
            />
          )}
        />
      )}
    </View>
  );
};

export default CurrencyList;
