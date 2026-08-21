{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE TemplateHaskell     #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE OverloadedStrings   #-}

module MintPolicy where

-- Minting policy that enforces serial NFTs using an on‑chain counter UTxO.
-- The policy expects the `ValidatorHash` of the counter script as parameter.
-- Behaviour:
--  - tx must consume the counter validator UTxO with datum `n`
--  - tx must mint exactly one token whose `TokenName` encodes `n`
--  - tx must produce a new counter UTxO at the same validator address with datum `n+1`

import           Plutus.V2.Ledger.Api      as PlutusV2
import           PlutusTx.Prelude         hiding (Semigroup(..), unless)
import qualified PlutusTx
import           Prelude                  (String)

{-# INLINABLE tokenNameFromInteger #-}
-- Convert an Integer counter to a TokenName (BuiltinByteString).
-- NOTE: adjust the conversion to your desired encoding (decimal string, binary, hash, ...).
tokenNameFromInteger :: Integer -> TokenName
tokenNameFromInteger i = TokenName (integerToBuiltinByteString i)

{-# INLINABLE integerToBuiltinByteString #-}
-- Small helper: serialize integer to builtin bytes. Replace with preferred encoding if needed.
integerToBuiltinByteString :: Integer -> BuiltinByteString
integerToBuiltinByteString i =
	-- naive conversion: use builtin `consByteString` on decimal ASCII digits
	let s = integerToString i
	in toBuiltin (stringToBuiltinByteString s)

{-# INLINABLE stringToBuiltinByteString #-}
stringToBuiltinByteString :: String -> BuiltinByteString
stringToBuiltinByteString s = toBuiltin (encodeUtf8 s)

{-# INLINABLE integerToString #-}
integerToString :: Integer -> String
integerToString i = fromBuiltin (intToBuiltin i)

-- The above helpers are placeholders: Plutus library provides utilities to
-- convert integers/strings to BuiltinByteString; adapt these helpers to the
-- actual available functions in your Plutus version.

{-# INLINABLE mkPolicy #-}
-- The policy expects three parameters:
--  1) the `ValidatorHash` of the counter script
--  2) the `PubKeyHash` (sale address) that must receive the required payment
--  3) the minimum price in lovelace that must be paid to the sale address
mkPolicy :: ValidatorHash -> PubKeyHash -> Integer -> BuiltinData -> BuiltinData -> ScriptContext -> Bool
mkPolicy vhash salePkh priceLovelace _ _ ctx =
	let info = scriptContextTxInfo ctx
			-- Find an input locked by the validator hash
			inputs = txInfoInputs info
			mCounterInput = find (\txIn -> case txInInfoResolved txIn of
																				 TxOut{txOutAddress = addr} -> case addressCredential addr of
																					 ScriptCredential vh -> vh == vhash
																					 _ -> False
																			) inputs
	in case mCounterInput of
			 Nothing -> traceError "counter input not found"
			 Just txIn ->
				 case txOutDatumHash (txInInfoResolved txIn) of
					 Nothing -> traceError "no datum on counter input"
					 Just dh ->
						 -- Read datum (assume Integer) and check minted token name and output counter
						 case findDatum dh info of
							 Nothing -> traceError "datum not found"
							 Just d ->
								 case PlutusTx.fromBuiltinData (getDatum d) of
									 Nothing -> traceError "invalid datum"
									 Just (n :: Integer) ->
										 let expectedName = tokenNameFromInteger n
												 minted = txInfoMint info
												 -- minted should contain exactly one asset under this policy with tokenName == expectedName
												 policySymbols = flattenValue minted
												 matches = filter (\(cs, tn, amt) -> cs == ownCurrencySymbol ctx && tn == expectedName && amt == 1) policySymbols
													-- ensure there is an output at the same validator with datum n+1
													outputs = txInfoOutputs info
													hasNewCounter = any (\out -> case addressCredential (txOutAddress out) of
																										ScriptCredential vh -> vh == vhash && case txOutDatumHash out of
																											Just h -> case findDatum h info of
																																	Just d' -> case PlutusTx.fromBuiltinData (getDatum d') of
																																								Just (m :: Integer) -> m == n + 1
																																								_ -> False
																																	_ -> False
																											_ -> False
																									_ -> False
																						) outputs
													-- ensure sale payment is present: sum lovelace sent to PubKeyCredential salePkh
													outputsToSale = filter (	xOut -> case addressCredential (txOutAddress txOut) of
																															PubKeyCredential pkh -> pkh == salePkh
																															_ -> False
																														) outputs
													lovelacePaid = foldl (	ot out -> tot + valueLovelace (txOutValue out)) 0 outputsToSale
											in if (length matches == 1) && hasNewCounter && lovelacePaid >= priceLovelace
												 then True
												 else traceError "minting conditions not satisfied or insufficient payment"

policyCompiled :: ValidatorHash -> PubKeyHash -> Integer -> MintingPolicy
policyCompiled vh salePkh price = mkMintingPolicyScript (PlutusV2.mkUntypedMintingPolicy $\_ _ -> mkPolicy vh salePkh price)

plutusScript :: ValidatorHash -> PubKeyHash -> Integer -> Script
plutusScript vh salePkh price = unMintingPolicyScript $ policyCompiled vh salePkh price

-- NOTE: PlutusTx.makeLift instances for `ValidatorHash` and `PubKeyHash` are required
PlutusTx.makeLift ''ValidatorHash
PlutusTx.makeLift ''PubKeyHash

-- Helper to extract lovelace amount from a Value. Adapt to Plutus version if helpers differ.
{-# INLINABLE valueLovelace #-}
valueLovelace :: Value -> Integer
valueLovelace v =
	let entries = flattenValue v
			adaEntries = filter (\(cs, tn, _) -> cs == adaSymbol && tn == adaToken) entries
	in case adaEntries of
			 [(_,_,amt)] -> amt
			 [] -> 0
			 ((_,_,amt):_) -> amt
