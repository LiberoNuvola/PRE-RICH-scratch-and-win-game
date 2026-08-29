{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE TemplateHaskell     #-}
{-# LANGUAGE ViewPatterns        #-}

module PrizePool
  ( mkValidator
  , compiledValidator
  ) where

import PlutusLedgerApi.V2
import PlutusLedgerApi.V2.Contexts
import PlutusTx
import PlutusTx.Prelude hiding (Semigroup (..), unless)

import Types (PrizePoolAction (..), PrizePoolDatum (..))

{-# INLINABLE bsToInteger #-}
bsToInteger :: BuiltinByteString -> Integer
bsToInteger bs = go 0 0
  where
    len = lengthOfByteString bs
    go i acc
      | i >= len  = acc
      | otherwise = go (i + 1) ((acc * 256) + indexByteString bs i)

{-# INLINABLE selectedIndex #-}
selectedIndex :: BuiltinByteString -> Integer -> Integer
selectedIndex seed poolSize =
  if poolSize <= 0 then 0
  else remainder (bsToInteger (sha2_256 seed)) poolSize

{-# INLINABLE nextIndexAfter #-}
nextIndexAfter :: Integer -> Integer -> Integer
nextIndexAfter current size =
  if current + 1 >= size then 0 else current + 1

{-# INLINABLE ownAddress #-}
ownAddress :: ScriptContext -> Address
ownAddress ctx =
  case findOwnInput ctx of
    Just i  -> txOutAddress (txInInfoResolved i)
    Nothing -> traceError "PrizePool: missing own input"

{-# INLINABLE countOwnInputs #-}
countOwnInputs :: Address -> [TxInInfo] -> Integer
countOwnInputs _ [] = 0
countOwnInputs addr (i:is) =
  if txOutAddress (txInInfoResolved i) == addr
    then 1 + countOwnInputs addr is
    else countOwnInputs addr is

{-# INLINABLE decodePoolDatum #-}
decodePoolDatum :: TxInfo -> TxOut -> Maybe PrizePoolDatum
decodePoolDatum info out =
  case txOutDatum out of
    OutputDatum d -> fromBuiltinData (getDatum d)
    OutputDatumHash dh ->
      case findDatum dh info of
        Just d  -> fromBuiltinData (getDatum d)
        Nothing -> Nothing
    NoOutputDatum -> Nothing

{-# INLINABLE findSingleContinuingDatum #-}
findSingleContinuingDatum :: Address -> TxInfo -> Maybe PrizePoolDatum
findSingleContinuingDatum addr info = go (txInfoOutputs info) Nothing
  where
    go [] acc = acc
    go (o:os) acc =
      if txOutAddress o == addr
        then case acc of
          Just _  -> Nothing
          Nothing ->
            case decodePoolDatum info o of
              Just d  -> go os (Just d)
              Nothing -> Nothing
        else go os acc

{-# INLINABLE validPoolDatum #-}
validPoolDatum :: PrizePoolDatum -> Bool
validPoolDatum d =
     ppPoolSize d > 0
  && ppNextIndex d >= 0
  && ppNextIndex d < ppPoolSize d

{-# INLINABLE integerToBytes #-}
integerToBytes :: Integer -> BuiltinByteString
integerToBytes n
  | n < 0     = integerToBytes 0
  | n == 0    = consByteString 48 emptyByteString
  | otherwise = go n emptyByteString
  where
    go x acc
      | x == 0    = acc
      | otherwise =
          let q = divide x 10
              r = remainder x 10
              digit = consByteString (48 + r) emptyByteString
          in go q (appendByteString digit acc)

{-# INLINABLE field #-}
field :: BuiltinByteString -> BuiltinByteString
field bs = appendByteString (integerToBytes (lengthOfByteString bs)) bs

{-# INLINABLE seedCommitment #-}
seedCommitment :: BuiltinByteString -> BuiltinByteString -> BuiltinByteString
seedCommitment seed salt =
  sha2_256 (appendByteString (field seed) (field salt))

{-# INLINABLE mkValidator #-}
mkValidator :: PrizePoolDatum -> PrizePoolAction -> ScriptContext -> Bool
mkValidator datum action ctx =
  let
    info = scriptContextTxInfo ctx
    addr = ownAddress ctx
    ownInputs = countOwnInputs addr (txInfoInputs info)
    currentIndex = ppNextIndex datum
    size = ppPoolSize datum
    selected = selectedIndex (ppSeed datum) size
    nextIndex = nextIndexAfter currentIndex size
    nextDatum = findSingleContinuingDatum addr info
    exactlyOneInput = ownInputs == 1
  in
    traceIfFalse "PrizePool: invalid current datum" (validPoolDatum datum)
      && traceIfFalse "PrizePool: exactly one pool input required" exactlyOneInput
      && case action of
           ClaimIndex idx ->
                traceIfFalse "PrizePool: wrong claim index" (idx == currentIndex)
             && traceIfFalse "PrizePool: selected index mismatch" (selected == currentIndex)
             && traceIfFalse "PrizePool: continuing output missing" (isJust nextDatum)
             && case nextDatum of
                  Nothing -> False
                  Just d ->
                       ppPoolSize d == size
                    && ppNextIndex d == nextIndex
                    && ppSeed d == ppSeed datum
                    && ppNextCommitment d == ppNextCommitment datum
                    && ppRound d == ppRound datum

           Refill idx ->
                idx >= 0 && idx < size
             && isJust nextDatum
             && case nextDatum of
                  Nothing -> False
                  Just d ->
                       ppPoolSize d == size
                    && ppNextIndex d == currentIndex
                    && ppSeed d == ppSeed datum
                    && ppNextCommitment d == ppNextCommitment datum
                    && ppRound d == ppRound datum

           RevealSeed seed salt newCommitment ->
             let commitmentOk = seedCommitment seed salt == ppNextCommitment datum
             in  lengthOfByteString seed > 0
                 && lengthOfByteString salt > 0
                 && commitmentOk
                 && lengthOfByteString newCommitment > 0
                 && isJust nextDatum
                 && case nextDatum of
                      Nothing -> False
                      Just d ->
                           ppPoolSize d == size
                        && ppNextIndex d == currentIndex
                        && ppSeed d == seed
                        && ppNextCommitment d == newCommitment
                        && ppRound d == ppRound datum + 1

{-# INLINABLE wrap #-}
wrap :: BuiltinData -> BuiltinData -> BuiltinData -> BuiltinUnit
wrap d r ctx =
  check
    ( mkValidator
        (unsafeFromBuiltinData d)
        (unsafeFromBuiltinData r)
        (unsafeFromBuiltinData ctx)
    )

compiledValidator :: CompiledCode (BuiltinData -> BuiltinData -> BuiltinData -> BuiltinUnit)
compiledValidator = $$(compile [|| wrap ||])