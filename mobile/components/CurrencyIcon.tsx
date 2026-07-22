import { useState } from 'react';
import { View, Image, Text } from 'react-native';
import { Currency } from '@/constants/type';
import { C, MONO } from '@/constants/theme';

/**
 * Full-bleed circular currency icon (spec 16).
 * - Fiat: a flag image from flagcdn, keyed by the currency's country code
 *   (first two letters, e.g. USD->us, EUR->eu). Thin gray ring.
 * - Crypto: the worker-provided coin logo (`currency.flag` holds the iconUrl).
 *   Thin blue ring.
 * On image error, falls back to a neutral circle showing the code.
 */
const flagUrl = (code: string) =>
  `https://flagcdn.com/w160/${code.slice(0, 2).toLowerCase()}.png`;

interface Props {
  currency: Currency;
  size?: number;
}

const CurrencyIcon: React.FC<Props> = ({ currency, size = 42 }) => {
  const [failed, setFailed] = useState(false);
  const isCrypto = currency.type === 'crypto';
  const uri = isCrypto ? currency.flag : flagUrl(currency.code);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        backgroundColor: C.raise,
        borderWidth: 1,
        borderColor: isCrypto ? C.blueLine : C.line2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {failed || !uri ? (
        <Text
          style={{
            fontFamily: MONO,
            fontSize: size * 0.28,
            fontWeight: '700',
            color: C.dim,
          }}
        >
          {currency.code.slice(0, 3)}
        </Text>
      ) : (
        <Image
          source={{ uri }}
          style={{ width: size, height: size }}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      )}
    </View>
  );
};

export default CurrencyIcon;
