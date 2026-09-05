# PRE-RICH — MASTER TODO V3

## Scopo

Questo documento è la roadmap operativa vincolante per portare PRE-RICH
dalla specifica economica V3 all'esecuzione reale su Cardano Preprod.

La TODO list viene versionata insieme alla documentazione V3 e deve essere
aggiornata durante lo sviluppo.

Principio architetturale fondamentale:

- USDM è la denominazione economica canonica.
- Ticket e premi sono espressi economicamente in USDM.
- Il regolamento fisico può avvenire in USDM, ADA o altri asset supportati.
- Il valore di regolamento deve essere determinato tramite il layer oracle
  canonico.
- Cambio dell'asset di regolamento ≠ cambio dell'obbligazione economica.
- La verità economica non può essere delegata a frontend, backend o relayer.
- Le invariant economiche devono essere verificabili on-chain.
FASE 1 — ECONOMIC CORE
TODO-01 — Canonical USDM valuation layer

[ ] Definire un unico modello condiviso per:

valorizzazione degli asset
conversione asset → USDM
precisione
rounding
gestione ADA
gestione USDM
gestione degli altri asset supportati
freshness oracle
eventuali asset non supportati

[ ] Evitare implementazioni duplicate tra:

ticket purchase
prize claim
pool accounting
treasury
bootstrap

[ ] Il medesimo modello deve produrre la stessa valutazione economica
indipendentemente dal percorso della transazione.

TODO-02 — Oracle authority

[ ] Correggere il modello di autenticazione dell'oracle.

[ ] Non è sufficiente verificare:

OracleDatum.odPublisher == authorizedPublisher

[ ] Bisogna autenticare anche che il datum provenga dall'effettiva
oracle state UTxO autorizzata.

[ ] Definire:

oracle identity
oracle state NFT / singleton
policy/name o altro meccanismo di autenticazione
validità temporale
asset pair
publisher authorization

[ ] Tutte le valutazioni economiche devono utilizzare esclusivamente
oracle state autenticata.

TODO-03 — Settlement asset model

[ ] Formalizzare il settlement asset nel modello dati.

[ ] Distinguere chiaramente:

economic denomination = USDM
settlement asset = ADA / USDM / altro asset supportato

[ ] Aggiornare dove necessario:

PrizeDatum
buy flow
claim flow
pool accounting
treasury
frontend quote
relayer

[ ] Non introdurre scorciatoie che confondano lovelace con USDM.

FASE 2 — TICKET PURCHASE
TODO-04 — Ticket purchase in USDM-equivalent

[ ] Eliminare la dipendenza economica dal pagamento fisso di 1 ADA.

[ ] Il buyer deve poter pagare il prezzo nominale USDM tramite:

USDM
ADA
asset supportati

[ ] La quantità fisica richiesta deve essere calcolata usando l'oracle
autenticato.

[ ] Il contratto deve verificare il valore economico, non semplicemente
un importo fisico arbitrario.

[ ] Il prezzo nominale del ticket deve restare quello dichiarato dal
PrizeDatum.

TODO-05 — Prize settlement in USDM-equivalent

[ ] Il premio deve essere memorizzato economicamente in USDM.

[ ] Il vincitore deve poter ricevere il controvalore in un settlement asset
supportato.

[ ] Il contratto deve verificare il valore ricevuto tramite il medesimo
layer oracle canonico.

[ ] La selezione dell'asset non deve alterare il valore economico del premio.

FASE 3 — POOL ACCOUNTING
TODO-06 — Physical Pool accounting

[ ] Allineare completamente:

ppTotalLiquidity
ppPendingLiabilities
ppUnresolvedReserve
ppLockedJackpot

con il valore fisico realmente contenuto nel Pool UTxO.

[ ] Eliminare qualsiasi transizione dove il datum cambia economicamente
senza corrispondente movimento fisico verificabile.

[ ] Definire formalmente la relazione:

Pool physical assets ↔ economic USDM value

TODO-07 — Atomic claim

[ ] Il claim deve essere atomicamente collegato alla riduzione del Pool.

[ ] La transazione deve dimostrare:

consumo Prize UTxO
consumo Pool UTxO
pagamento al vincitore
nuovo Pool UTxO
nuova liquidità
nuova liability
stato Claimed

[ ] Il valore fisico distribuito deve corrispondere al valore economico
detratto.

TODO-08 — Single claim path

[ ] Eliminare i percorsi claim concorrenti.

[ ] Mantenere un solo flusso canonico:

UI → claimFlow canonical → Pool + Prize → settlement

[ ] Rimuovere codice legacy incompatibile.

FASE 4 — TICKET CLASSES
TODO-09 — Canonical ticket ladder

[ ] Implementare la ladder:

1 USDM
2 USDM
3 USDM
5 USDM
10 USDM
25 USDM
50 USDM
100 USDM

[ ] Il prezzo Genesis è 1 USDM.

TODO-10 — CurrentActiveClass

[ ] Implementare:

CurrentActiveClass = highest class satisfying all economic safety constraints

[ ] Nessuna classe può essere vendibile se viola le condizioni di sicurezza.

TODO-11 — Automatic suspension

[ ] Implementare degradazione:

100 → 50 → 25 → 10 → 5 → 3 → 2 → 1 → HALT

[ ] La sospensione delle classi superiori non invalida i ticket esistenti.

[ ] I premi già cristallizzati restano pagabili.

FASE 5 — SOLVENCY E EXPOSURE
TODO-12 — Worst-case unresolved exposure

[ ] Formalizzare e implementare:

WorstCaseUnresolvedExposure = 500 × ppUnresolvedReserve

[ ] Tale invariant deve essere verificabile on-chain.

TODO-13 — Per-class exposure

[ ] Aggiungere esposizione aggregata per classe quando necessaria per
determinare la vendibilità della classe.

[ ] Una classe superiore non deve poter compromettere la solvibilità
delle classi già attive.

TODO-14 — Issuance safety

[ ] Prima di emettere un nuovo ticket verificare che l'esposizione
worst-case risultante sia compatibile con la liquidità disponibile.

[ ] La vendita deve essere preventiva rispetto all'incremento
dell'esposizione.

TODO-15 — Safety floor

[ ] Definire e applicare il livello minimo di sicurezza economica.

[ ] Verificare che il sistema non venda nuovi ticket quando non può
sostenere il relativo worst-case exposure.

TODO-16 — HighestClassEverActivated

[ ] Conservare il massimo livello di classe mai attivato.

[ ] Questo valore deve alimentare la logica jackpot.

FASE 6 — TREASURY
TODO-17 — Treasury V3

[ ] Convertire Treasury dalla logica ADA-only alla logica economica USDM.

[ ] Definire il meccanismo di valorizzazione tramite oracle.

TODO-18 — Distributable surplus

[ ] Separare:

gross revenue
liabilities
reserves
locked funds
distributable surplus

[ ] Il treasury deve distribuire esclusivamente il surplus effettivamente
distribuibile.

TODO-19 — Distribution split

[ ] Implementare:

75% PrizePool
10% Reserve
10% Stake
5% Maintenance

[ ] Applicare le percentuali al distributable surplus, non al lordo.

TODO-20 — Relayer reward

[ ] Definire un reward bounded per il relayer.

[ ] Il relayer non deve diventare una quota arbitraria del treasury.

FASE 7 — JACKPOT
TODO-21 — Jackpot state machine

[ ] Definire formalmente:

qualification
threshold
accumulation
lock
trigger
winner
payout
reset
TODO-22 — Jackpot accounting isolation

[ ] Il jackpot deve restare distinto dalla normale liquidità disponibile.

[ ] ppLockedJackpot deve essere escluso da EffectivePool.

TODO-23 — Jackpot randomness

[ ] Integrare il jackpot con il sistema canonico di randomness.

[ ] Nessuna selezione winner deve dipendere da frontend/relayer.

FASE 8 — BEACON / B1 / FUTURE B3
TODO-24 — B1 clarification

[ ] Documentare e verificare definitivamente il trust boundary B1.

[ ] Il registry deve rimanere il punto di pubblicazione autorizzato.

[ ] La validazione on-chain deve ricostruire indipendentemente il beacon.

TODO-25 — Future B3

[ ] Separare chiaramente le future estensioni B3 dalla sicurezza minima
richiesta per B1.

[ ] Non introdurre dipendenze B3 prematuramente nel core economico.

FASE 9 — OFF-CHAIN / UI / RELAYER
TODO-26 — Canonical buy API

[ ] Unificare:

selezione ticket class
price USDM
settlement asset
oracle quote
transaction building
ticket mint
TODO-27 — Settlement quote

[ ] Il frontend deve mostrare:

prezzo economico USDM
asset scelto
quantità richiesta
oracle timestamp
eventuale slippage/tolleranza applicabile

[ ] Il quote mostrato non deve essere la fonte della verità.

TODO-28 — Reveal

[ ] Allineare completamente il flow off-chain al validator on-chain.

[ ] Nessuna duplicazione incoerente della logica economica.

TODO-29 — Claim

[ ] Riscrivere il claim builder per supportare settlement asset.

[ ] Eliminare il pagamento diretto in lovelace come rappresentazione
del premio USDM.

[ ] Il Pool deve essere realmente drenato del valore distribuito.

TODO-30 — Remove legacy UI

[ ] Rimuovere:

legacyBindings.ts
placeholder claim
selezione ticket non collegata al mint
percorsi legacy claim

[ ] La UI deve utilizzare esclusivamente l'architettura canonica.

FASE 10 — TEST
TODO-31 — Economic unit tests

[ ] Test per:

conversione USDM
rounding
ticket prices
payout formula
effective pool
reserve
treasury split
class activation
TODO-32 — Adversarial oracle tests

[ ] Testare:

fake publisher datum
fake oracle UTxO
stale oracle
asset mismatch
missing oracle
malicious extra assets
TODO-33 — Pool tests

[ ] Testare:

physical conservation
funding
issue
reveal
claim
expiry
singleton NFT
incorrect Pool outputs
TODO-34 — Class tests

[ ] Testare:

activation
suspension
recovery
class ordering
existing tickets after suspension
TODO-35 — Exposure tests

[ ] Testare:

worst-case exposure
per-class exposure
issuance at limit
issuance above limit
emergency HALT

[ ] Distinguere chiaramente:

mirror/unit tests
emulator tests
real Plutus validation tests
FASE 11 — PREPROD
TODO-36 — Deployment topology

[ ] Deployare su Preprod:

Treasury
Counter
BeaconRegistry
PrizeValidator
B1PrizePool
MintPolicy
oracle state

[ ] Verificare tutti gli hash/address derivati.

TODO-37 — Bootstrap

[ ] Iniettare la liquidità/bootstrap prevista.

[ ] Verificare che il bootstrap PRE non venga confuso automaticamente
con la PrizePool liquidity.

TODO-38 — Genesis activation

[ ] Verificare on-chain:

TreasuryPREValueUSDM >= 4,000 USDM

[ ] Verificare attivazione Genesis.

TODO-39 — Buy test

[ ] Comprare un Genesis ticket utilizzando ADA.

[ ] Verificare:

quote oracle
valore economico 1 USDM
Treasury payment
Pool reservation
Counter increment
Ticket NFT
PrizeDatum

[ ] Ripetere con USDM quando disponibile.

TODO-40 — Beacon sync

[ ] Pubblicare beacon autorizzato.

[ ] Eseguire SyncBeacon su Preprod.

[ ] Verificare stato Ready.

TODO-41 — Reveal

[ ] Eseguire reveal reale.

[ ] Verificare:

commitment
beacon
seed
symbols
result
tier
payout
Pool reserve/liability transition
TODO-42 — Claim

[ ] Eseguire claim reale.

[ ] Testare settlement in ADA.

[ ] Testare settlement in USDM quando disponibile.

[ ] Verificare:

pagamento economicamente corretto
Pool physical value decrement
liquidity decrement
liability decrement
Prize = Claimed
ticket NFT retained
TODO-43 — Adversarial Preprod tests

[ ] Tentare transazioni volutamente invalide:

fake oracle
stale oracle
incorrect payment
incorrect payout
incorrect Pool value
double claim
wrong owner
wrong ticket class
issuance beyond safety
suspended class
modified PrizeDatum
modified PoolDatum

[ ] Ogni tentativo deve fallire on-chain.

DONE CRITERIA

Il progetto è considerato pronto per una release di test pubblico solo quando:

[ ] Economic denomination USDM è canonica.

[ ] Settlement multi-asset è verificato on-chain.

[ ] Oracle authority è autenticata.

[ ] Pool accounting economico e fisico coincidono.

[ ] Ticket issuance è soggetta a safety/exposure constraints.

[ ] Class ladder e suspension sono on-chain.

[ ] Claim è atomico e unico.

[ ] Treasury V3 è implementato.

[ ] Jackpot accounting è isolato.

[ ] Test adversarial passano.

[ ] Flusso completo BUY → SYNC → REVEAL → CLAIM funziona su Preprod.

[ ] Sono presenti test Preprod con transazioni valide e transazioni
intenzionalmente invalide.

REGOLA OPERATIVA

Ogni modifica al codice deve:

riferirsi a uno o più TODO identificabili;
mantenere invarianti già chiuse;
aggiornare questo documento quando un TODO viene completato;
aggiungere test prima di dichiarare completata una modifica critica;
non introdurre una nuova fonte di verità economica parallela.