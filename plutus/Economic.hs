{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE ScopedTypeVariables #-}

module Economic
  ( usdmPrecision
  , adaMinUtxo
  , oracleMaxAge
  , ceilingDiv
  , validOracleTimestamp
  , oraclePriceFor
  , totalUsdmValue
  , poolUsdmValue
  ) where

import PlutusLedgerApi.V2
import PlutusLedgerApi.V2.Contexts
import PlutusTx.Prelude
import qualified PlutusTx.AssocMap as AssocMap

import Types
  ( OracleDatum (..)
  , precision
  , minUtxoLovelace
  , maxOracleAge
  )

{-# INLINABLE usdmPrecision #-}
usdmPrecision :: Integer
usdmPrecision = precision

{-# INLINABLE adaMinUtxo #-}
adaMinUtxo :: Integer
adaMinUtxo = minUtxoLovelace

{-# INLINABLE oracleMaxAge #-}
oracleMaxAge :: Integer
oracleMaxAge = maxOracleAge

-- | Ceiling division.
-- Positive economic quantities are rounded upward so a settlement
-- can never be accepted below its required USDM value.
{-# INLINABLE ceilingDiv #-}
ceilingDiv :: Integer -> Integer -> Integer
ceilingDiv a b
  | b == 0 =
      traceError "Economic: division by zero"

  | a <= 0 =
      0

  | b < 0 =
      traceError "Economic: invalid divisor"

  | otherwise =
      (a + b - 1) `divide` b

-- | Oracle timestamp validation against the transaction validity
-- upper bound.
{-# INLINABLE validOracleTimestamp #-}
validOracleTimestamp
  :: Integer
  -> TxInfo
  -> Bool
validOracleTimestamp timestamp info =
  case ivTo (txInfoValidRange info) of
    UpperBound (Finite t) _ ->
      let
        now =
          getPOSIXTime t
      in
        timestamp <= now
          && now - timestamp <= maxOracleAge

    _ ->
      False

{-# INLINABLE decodeOracleDatum #-}
decodeOracleDatum
  :: TxInfo
  -> TxOut
  -> Maybe OracleDatum
decodeOracleDatum info out =
  case txOutDatum out of
    OutputDatum d ->
      fromBuiltinData (getDatum d)

    OutputDatumHash dh ->
      case findDatum dh info of
        Just d ->
          fromBuiltinData (getDatum d)

        Nothing ->
          Nothing

    NoOutputDatum ->
      Nothing

-- | Resolve an oracle price from the reference-input set.
--
-- IMPORTANT:
-- This is the valuation primitive only.
-- TODO-02 will add authentication of the actual authorized oracle state.
{-# INLINABLE oraclePriceFor #-}
oraclePriceFor
  :: [TxInInfo]
  -> PubKeyHash
  -> TxInfo
  -> BuiltinByteString
  -> BuiltinByteString
  -> Integer
oraclePriceFor [] _ _ _ _ =
  traceError "Economic: oracle missing"

oraclePriceFor
  (i:is)
  publisher
  info
  csBytes
  tnBytes =
  case decodeOracleDatum
         info
         (txInInfoResolved i) of

    Just od
      | odAssetPolicy od == csBytes
      && odAssetName od == tnBytes
      && odPublisher od == publisher
      && validOracleTimestamp
           (odTimestamp od)
           info
      && odPrice od >= 0 ->
          odPrice od

    _ ->
      oraclePriceFor
        is
        publisher
        info
        csBytes
        tnBytes

-- | Canonical conversion from Value to USDM sub-units.
--
-- ADA:
--   the protocol minimum-UTxO amount is excluded from economic value.
--
-- Other assets:
--   the complete quantity is valued.
--
-- Every asset encountered by this function requires a matching oracle.
{-# INLINABLE totalUsdmValue #-}
totalUsdmValue
  :: TxInfo
  -> PubKeyHash
  -> Value
  -> Integer
totalUsdmValue info publisher val =
  go
    (txInfoReferenceInputs info)
    (AssocMap.toList (getValue val))
  where

    go _ [] =
      0

    go refs ((cs, innerMap):rest) =
      goInner
        refs
        (unCurrencySymbol cs)
        (AssocMap.toList innerMap)
        + go refs rest

    goInner _ _ [] =
      0

    goInner
      refs
      csBytes
      ((tn, amt):rest) =
      let
        price =
          oraclePriceFor
            refs
            publisher
            info
            csBytes
            (unTokenName tn)

        economicAmt
          | csBytes == unCurrencySymbol adaSymbol
          && unTokenName tn == unTokenName adaToken =
              max
                0
                (amt - minUtxoLovelace)

          | otherwise =
              amt

      in
        ceilingDiv
          (economicAmt * price)
          precision
          + goInner
              refs
              csBytes
              rest

-- | Canonical Pool valuation excluding the protocol singleton NFT.
{-# INLINABLE poolUsdmValue #-}
poolUsdmValue
  :: TxInfo
  -> PubKeyHash
  -> BuiltinByteString
  -> BuiltinByteString
  -> Value
  -> Integer
poolUsdmValue
  info
  publisher
  poolPolicy
  poolName
  val =
  totalUsdmValue
    info
    publisher
    ( val
      - singleton
          (CurrencySymbol poolPolicy)
          (TokenName poolName)
          1
    )