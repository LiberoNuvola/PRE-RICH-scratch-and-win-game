
CONSTITUTION-V3-Deterministic-Economy.md


PRE-RICH — COSTITUZIONE DEL PROTOCOLLO
Versione: Constitution V3 — Deterministic Economy
Stato: normativa fondamentale del protocollo
Ambito: principi, invarianti, regole economiche, sicurezza, governance e limiti di autorità del protocollo PRE-RICH

PREAMBOLO
PRE-RICH è un protocollo di gioco on-chain progettato per operare senza affidare a un team, founder, amministratore, backend, relayer o singolo operatore la determinazione della verità economica del gioco.

La proprietà fondamentale del protocollo è:

La validità del gioco deve derivare da regole deterministiche, verificabili on-chain e da prove verificabili, non dalla fiducia in chi lo gestisce.

PRE-RICH deve essere:

automatico;

non custodial;

pubblico e verificabile;

open source;

privo di una quota economica discrezionale destinata a team, developer, founder o amministratori;

resistente alla manipolazione;

resistente al double claim;

resistente alla scelta del risultato dopo l'acquisto;

progettato affinché nessun componente off-chain possa diventare autorità economica.

La presente Costituzione definisce cosa deve essere vero.

Le specifiche definiscono come tali proprietà devono essere implementate.

Il codice implementa le specifiche.

I test e le prove dimostrano le proprietà.

ARTICOLO 1 — GERARCHIA NORMATIVA
La gerarchia normativa è:

CONSTITUTION
      ↓
SPECIFICATIONS
      ↓
IMPLEMENTATION
      ↓
TESTS / PROOFS
Una specifica non può autorizzare una violazione della Costituzione.

Un'implementazione non è conforme semplicemente perché è “simile” alla specifica: deve soddisfare gli invarianti richiesti.

ARTICOLO 2 — PRINCIPIO DI TRUSTLESSNESS
PRE-RICH non deve richiedere fiducia in un soggetto umano per determinare:

il risultato di un ticket;

la randomness;

il winner;

il tier;

il payout;

l'attivazione del Jackpot;

la validità del claim;

la solvibilità necessaria a creare nuova esposizione;

l'allocazione economica prevista dal protocollo;

la canonicalità di uno stato esterno utilizzato dal gioco.

Un componente off-chain può osservare, indicizzare, costruire transazioni, trasportare dati e produrre prove.

Non può decidere la verità economica.

The publisher may submit evidence. The verifier determines validity.

The adapter may observe and prove. The adapter must not decide.

ARTICOLO 3 — AUTORITÀ ON-CHAIN
Cardano costituisce il livello di enforcement economico del protocollo.

Il browser non è autorità.

Il backend non è autorità.

Il relayer non è autorità.

Un database off-chain non è autorità.

Un API endpoint non è autorità.

Un provider di dati esterno non è autorità economica.

Le condizioni che determinano diritti economici devono essere verificabili dai validator e/o da stato on-chain autenticato.

ARTICOLO 4 — STATO ATTUALE E STATO OBIETTIVO
La documentazione deve distinguere sempre tra:

proprietà implementate e testate;

proprietà parzialmente implementate;

proprietà in sviluppo;

target architetturali futuri.

B1 non deve essere presentato come B3.

PoC-0 non deve essere presentato come prova definitiva di canonicalità.

PoC-1A non deve essere presentato come finality proof completo finché tutti i requisiti di finalità non sono verificati.

ARTICOLO 5 — UNITÀ ECONOMICA CANONICA
L'unità economica canonica di PRE-RICH è:

USDM

USDM è l'unità di riferimento per:

prezzo dei ticket;

valore dei premi;

soglie economiche;

esposizione;

reserve;

safety capital;

pending liabilities;

Jackpot;

attivazione delle classi.

Un asset diverso da USDM può essere utilizzato solo attraverso una conversione verificabile secondo le regole del protocollo.

La UI non costituisce autorità sul valore economico.

ARTICOLO 6 — GENESIS
Genesis è la prima classe economica del protocollo.

Il prezzo Genesis è:

1 USDM

Genesis è il punto di ingresso minimo della ladder economica.

L'attivazione iniziale di Genesis può dipendere dal meccanismo di bootstrap PRE definito dall'economia di protocollo.

Una volta attivato Genesis, l'attivazione non può essere usata retroattivamente per invalidare ticket già emessi.

ARTICOLO 7 — BOOTSTRAP PRE DI GENESIS
Il protocollo può utilizzare una posizione PRE detenuta dal Treasury per soddisfare la condizione iniziale di bootstrap.

La soglia economica di riferimento è:

4.000 USDM di valore verificato

La condizione è:

TreasuryPREValueUSDM >= 4,000 USDM
con:

TreasuryPREValueUSDM =
    TreasuryPREQuantity × VerifiedPRE_USDMPrice
La posizione PRE di bootstrap:

non equivale automaticamente a liquidità PrizePool;

non costituisce da sola una promessa di settlement;

deve essere valorizzata attraverso un meccanismo verificabile;

non deve essere confusa con market capitalization o fully diluted valuation.

ARTICOLO 8 — LADDER DEI TICKET
Le classi economiche previste sono:

1
2
3
5
10
25
50
100 USDM
La classe Genesis è la classe da 1 USDM.

Le classi superiori non vengono attivate manualmente.

La loro disponibilità deriva dallo stato economico verificabile del protocollo.

ARTICOLO 9 — DETERMINAZIONE DETERMINISTICA DELLA CLASSE ATTIVA
La classe attiva deve essere determinata automaticamente.

Il principio è:

CurrentActiveClass =
    highest class C for which the verified
    post-sale economic state remains safe
La disponibilità deve dipendere almeno da:

liquidità effettiva;

pending winning liabilities;

unresolved-ticket reserve;

locked Jackpot;

safety floor;

esposizione massima consentita;

limiti per classe.

Un operatore non può “abilitare” una classe che il modello economico considera non sostenibile.

ARTICOLO 10 — EXPOSURE E RISCHIO
PRE-RICH distingue esplicitamente tra:

Riserva statistica
Capitale accantonato per l'esposizione attesa e per una variabilità modellata.

Esposizione deterministica
Capitale richiesto per sostenere il worst case ammesso dal protocollo.

La riserva statistica non deve essere descritta come garanzia assoluta di pagamento.

Il protocollo deve mantenere un limite deterministico sull'esposizione economica consentita.

Per una classe con prezzo P e un limite di N ticket irrisolti:

WorstCaseExposure(P, N) = 500 × P × N
perché il massimo payout normale è 500 volte il prezzo del ticket.

Questo valore può essere utilizzato per impedire che il numero di ticket irrisolti superi la capacità economica definita dal protocollo.

ARTICOLO 11 — RISERVA DEI TICKET IRRISOLTI
Ogni ticket non ancora rivelato costituisce un'incertezza economica.

Il protocollo deve quindi mantenere una unresolved-ticket reserve.

La riserva statistica può essere modellata come:

UnresolvedReserve(N) =
    N × μ + Z × σ × sqrt(N)
dove:

N = numero di ticket irrisolti;

μ = payout atteso;

σ = deviazione standard del payout;

Z = coefficiente di confidenza.

Il modello di Genesis utilizza come riferimento:

Loss       75%
1 USDM     17%
2.5 USDM    6%
5 USDM      1.8%
100 USDM    0.19%
500 USDM    0.01%
con valori indicativi:

μ ≈ 0.65 USDM
σ ≈ 6.676 USDM
Z ≈ 3.09
Questi sono parametri di modellazione.

Non autorizzano la creazione di liability non sostenibili.

ARTICOLO 12 — LIMITI PER CLASSE
La gestione della capacità economica deve distinguere almeno:

classe corrente;

numero di ticket irrisolti per classe;

esposizione massima per classe;

esposizione aggregata;

capacità disponibile del PrizePool.

La struttura può essere rappresentata come:

ClassExposure(C)
ClassUnresolved(C)
ClassCap(C)
Il protocollo non deve consentire che una singola classe ad alto valore consumi implicitamente tutta la capacità disponibile senza rispettare il proprio limite.

Quando necessario, la disponibilità deve essere calcolata sullo stato post-vendita.

ARTICOLO 13 — HYSTERESIS
L'attivazione e la sospensione delle classi devono utilizzare soglie diverse.

Per una classe C:

ActivationThreshold(C)
    >
SuspensionThreshold(C)
in condizioni normali.

Questo evita oscillazioni continue:

ACTIVE → SUSPENDED → ACTIVE → SUSPENDED
causate da piccole variazioni della liquidità.

La hysteresis deve essere deterministica.

Non può essere scelta dal relayer al momento della transazione.

ARTICOLO 14 — SAFETY CIRCUIT BREAKER
Se la solvibilità diminuisce, il protocollo riduce automaticamente l'esposizione.

La sequenza di riduzione è:

100
 ↓
50
 ↓
25
 ↓
10
 ↓
5
 ↓
3
 ↓
2
 ↓
1
 ↓
HALT
La sospensione:

riguarda le nuove vendite;

non invalida ticket esistenti;

non riduce payout cristallizzati;

non modifica risultati storici.

Se anche Genesis non è sostenibile, le nuove vendite devono fermarsi.

ARTICOLO 15 — CLASSE CORRENTE E MASSIMA CLASSE RAGGIUNTA
Il protocollo deve distinguere tra:

CurrentActiveClass
e:

HighestClassEverActivated
CurrentActiveClass può diminuire quando la solvibilità peggiora.

HighestClassEverActivated è monotona non decrescente.

Una contrazione temporanea della liquidità non deve retroattivamente cancellare il fatto che una certa classe sia stata raggiunta.

Questo principio è particolarmente rilevante per il modello del Jackpot.

ARTICOLO 16 — PREZZO E PAGAMENTO DEL TICKET
Il valore economico del ticket è espresso in USDM.

L'utente può pagare utilizzando:

USDM;

ADA;

altri asset supportati dal protocollo.

Quando l'asset di pagamento differisce da USDM, il protocollo determina l'equivalente attraverso una conversione verificata.

Il valore del pagamento non è determinato dalla UI.

La conversione deve essere effettuata utilizzando dati validati e le regole di arrotondamento del protocollo.

ARTICOLO 17 — ATOMICITÀ DELLA VENDITA
Per B1, la vendita economicamente valida deve vincolare:

ticket mint
+
Treasury payment
+
PrizePool reservation
alla stessa transazione o a un meccanismo on-chain equivalente che garantisca l'assenza di ticket economicamente “non pagati” o “non riservati”.

Il backend non può sostituire tale vincolo con bookkeeping off-chain.

ARTICOLO 18 — TREASURY
Tutte le entrate del gioco devono entrare nel Treasury previsto dal protocollo.

Non deve esistere:

PLAYER → TEAM → TREASURY
ma:

PLAYER
   ↓
PROTOCOL TREASURY
   ↓
PROTOCOL-CONTROLLED CATEGORIES
Non esiste una quota personale per team, founder, developer o administrator.

ARTICOLO 19 — PRIORITÀ ECONOMICHE
La distribuzione economica deve rispettare una logica liability-first.

La priorità normativa è:

pending crystallised winning liabilities;

unresolved-ticket reserve;

PrizePool safety capital;

locked Jackpot liquidity;

Reserve protection;

distributable surplus.

Il capitale necessario a soddisfare una priorità superiore non può essere distribuito come surplus.

ARTICOLO 20 — PRIZEPOOL
PrizePool è una componente economica protocol-controlled.

In B1 il modello preferito è un PrizePool globale con stato atomico per:

liquidità;

unresolved reserve;

unresolved count;

pending liabilities;

locked Jackpot;

threshold;

class suspension state.

Una futura suddivisione del pool deve conservare equivalenti garanzie economiche globali.

ARTICOLO 21 — EFFECTIVE POOL
Il protocollo deve distinguere tra liquidità lorda e liquidità effettivamente disponibile.

Concettualmente:

effectivePool(A) =
    totalLiquidity(A)
  - pendingWinningLiabilities(A)
  - unresolvedTicketReserve(A)
  - lockedJackpotLiquidity(A)
I componenti già impegnati economicamente non possono essere contati due volte.

Il protocollo deve garantire:

pendingWinningLiabilities
+ unresolvedTicketReserve
+ lockedJackpotLiquidity
≤ totalLiquidity
e quindi:

effectivePool ≥ 0
ARTICOLO 22 — PAYOUT NORMALE
Il payout normale deriva dal risultato e dalla tabella delle Game Rules.

Per la struttura corrente, il massimo payout normale è:

500 × ticket price
Pertanto:

Ticket	Max normal payout
1 USDM	500 USDM
2 USDM	1,000 USDM
3 USDM	1,500 USDM
5 USDM	2,500 USDM
10 USDM	5,000 USDM
25 USDM	12,500 USDM
50 USDM	25,000 USDM
100 USDM	50,000 USDM
Questo massimale costituisce il riferimento costituzionale per la scala del Jackpot.

ARTICOLO 23 — CALCOLO DEL PREMIO
La sequenza normativa è:

REVEAL
   ↓
VERIFY RANDOMNESS
   ↓
DERIVE SYMBOLS
   ↓
DERIVE TIER
   ↓
CALCULATE EFFECTIVE POOL
   ↓
CALCULATE PAYOUT
   ↓
VERIFY SOLVENCY
   ↓
CRYSTALLISE
Un payout non può superare la capacità economica ammessa dal protocollo.

Per il modello corrente:

Payout ≤ EffectivePool_before_reveal
quando la transizione di reveal richiede tale condizione.

ARTICOLO 24 — CRISTALLIZZAZIONE
Al reveal di un ticket vincente devono diventare determinati on-chain:

result;

tier;

payout;

claimability;

expiry;

informazioni economiche necessarie alla verifica storica.

Dopo la cristallizzazione:

FrozenPayout = immutable
Un futuro cambiamento del PrizePool non può modificare il payout.

ARTICOLO 25 — FLOOR DEL PREMIO
Il protocollo non adotta un floor indipendente che possa forzare la creazione di una liability non sostenibile.

Il principio costituzionale è:

La correttezza del risultato economico è subordinata alla solvibilità verificabile del protocollo.

Qualunque minimum prize effettivamente utilizzato deve essere coerente con la struttura di esposizione e con il capitale disponibile.

Un semplice messaggio UI non può trasformarsi in una promessa economica.

ARTICOLO 26 — SETTLEMENT MULTI-ASSET
Il premio è denominato economicamente in USDM.

Se il PrizePool non dispone di sufficiente USDM ma dispone di un asset di settlement approvato, il protocollo può soddisfare la stessa obbligazione attraverso conversione verificata.

Esempio:

FrozenPrize = 10,000 USDM
Il settlement può utilizzare ADA o altro asset supportato.

Il cambio di asset non riduce il valore economico del premio.

La conversione deve impedire il sotto-pagamento.

Oracle assente, stale, non autorizzato o incoerente deve causare il fallimento della transazione quando l'oracle è necessario.

ARTICOLO 27 — JACKPOT: PRINCIPIO
Il Jackpot è economicamente separato dalla normale distribuzione dei cinque simboli.

La sua attivazione non modifica la distribuzione normale:

1 2 3 4 5
Il Jackpot non è una decisione amministrativa.

La sua attivazione deve derivare dallo stato economico verificato.

ARTICOLO 28 — JACKPOT A GRADINI
Il Jackpot deve essere significativamente superiore al massimo payout normale.

Definendo:

M = 500 × HighestClassEverActivated
la ladder di riferimento è:

J1 = 10 × M
J2 = 20 × M
J3 = 50 × M
J4 = 100 × M
J5 = 250 × M
Alla sola classe Genesis:

M = 500 USDM
e quindi:

Livello	Jackpot
J1	5,000 USDM
J2	10,000 USDM
J3	25,000 USDM
J4	50,000 USDM
J5	125,000 USDM
Quando viene raggiunta una classe superiore, la scala futura del Jackpot cresce proporzionalmente.

La struttura è monotona rispetto alla massima classe storicamente attivata.

ARTICOLO 29 — JACKPOT THRESHOLD E JACKPOT BALANCE
Il protocollo deve distinguere tra:

JackpotThreshold
e:

LockedJackpotBalance
Il threshold stabilisce quando un determinato livello può diventare attivo.

Il balance rappresenta la liquidità effettivamente accumulata per il Jackpot.

Il protocollo non deve confondere un semplice threshold con una disponibilità economica effettiva.

ARTICOLO 30 — FINANZIAMENTO DEL JACKPOT
Il Jackpot deve essere finanziato esclusivamente da capitale che rimane economicamente disponibile dopo le priorità obbligatorie.

Il finanziamento del Jackpot non può essere effettuato sacrificando:

crystallised liabilities;

unresolved reserve;

safety capital;

riserve necessarie.

Il tasso di allocazione al Jackpot può essere governabile entro limiti costituzionali, ma la regola deve essere deterministica.

ARTICOLO 31 — JACKPOT E EFFECTIVE POOL
La liquidità destinata al Jackpot diventa economicamente separata.

Per questo motivo:

lockedJackpotLiquidity
deve essere sottratta da effectivePool quando non è contemporaneamente rappresentata in altre liability.

Il Jackpot non può essere conteggiato due volte.

Il finanziamento di un livello Jackpot deve lasciare verificabile la solvibilità dello stato risultante.

ARTICOLO 32 — VINCITORE DEL JACKPOT
La selezione del ticket Jackpot deve derivare dalla randomness canonica.

Nessun backend, relayer, administrator o publisher può:

scegliere il vincitore;

scegliere il ticket;

assegnare retroattivamente il Jackpot;

modificare il Jackpot dopo avere osservato il risultato.

La randomness del Jackpot deve essere domain-separated dalla derivazione dei simboli normali quando la specifica lo richiede.

ARTICOLO 33 — PAYOUT DEL JACKPOT
Quando il Jackpot viene vinto, l'obbligazione deve essere cristallizzata secondo una regola deterministica.

Il payout Jackpot deve derivare esclusivamente dallo stato on-chain del Jackpot e dalla regola di Jackpot vigente al momento della determinazione.

Una volta cristallizzato:

FrozenJackpotPayout = immutable
Il payout non può essere ridotto successivamente perché il pool diminuisce.

ARTICOLO 34 — RESET DEL JACKPOT
Dopo una vincita Jackpot, il capitale effettivamente trasferito nell'obbligazione del vincitore non deve continuare a essere considerato locked Jackpot liquidity.

Il meccanismo di ricostruzione del Jackpot deve essere deterministico.

HighestClassEverActivated non retrocede dopo una vincita Jackpot.

Il nuovo Jackpot ricomincia quindi a costruirsi secondo la scala e i limiti applicabili allo stato storico raggiunto dal protocollo.

ARTICOLO 35 — TICKET
Ogni ticket deve avere:

identità unica;

binding crittografico;

owner verificabile;

stato economico verificabile;

expiry verificabile;

storia verificabile.

Il ticket è un NFT/native asset trasferibile.

ARTICOLO 36 — SECONDARY MARKET
Il diritto economico segue il ticket.

Una sequenza valida può essere:

Alice
 ↓
Bob
 ↓
Charlie
 ↓
Reveal
Il trasferimento non deve modificare il risultato.

Il trasferimento non deve permettere di determinare il risultato prima del reveal.

Un ticket vincente non reclamato può essere trasferibile, quando il protocollo lo consente.

ARTICOLO 37 — RETENTION DELL'NFT
Il claim non richiede obbligatoriamente la distruzione del ticket.

Un ticket dopo il claim può conservare:

identità;

risultato;

tier;

payout storico;

stato CLAIMED;

Jackpot status;

storia dei trasferimenti.

Il ticket può avere valore collezionistico anche dopo l'esercizio del diritto economico.

ARTICOLO 38 — BURN VOLONTARIO
Il proprietario può scegliere:

CLAIM + KEEP NFT
oppure:

CLAIM + BURN NFT
Il burn:

non è un claim;

non genera refund;

non genera bonus;

non crea un nuovo diritto economico.

CLAIM ≠ BURN

ARTICOLO 39 — COMMIT-REVEAL
PRE-RICH utilizza un modello commit-reveal.

Il commitment deve essere legato al contesto del ticket, inclusi quando applicabili:

game;

round;

ticket identity;

ticket nonce;

protocol version;

configuration context.

Il reveal deve essere verificato on-chain.

Il giocatore non può scegliere un risultato dopo avere ottenuto informazioni sufficienti per selezionarlo.

ARTICOLO 40 — RANDOMNESS
La randomness deve essere:

deterministica rispetto agli input canonici;

imprevedibile prima della disponibilità degli input necessari;

domain-separated;

immune al modulo bias quando applicabile;

derivata attraverso regole identiche in Plutus e TypeScript.

La derivazione non può essere scelta da frontend, backend o relayer.

ARTICOLO 41 — DOMAIN SEPARATION
Ogni derivazione crittografica distinta deve utilizzare domain separation.

Le domain string devono essere:

esplicite;

versionate;

documentate;

condivise tra on-chain e off-chain;

coperte da golden vectors.

Una modifica della domain separation che altera i risultati costituisce breaking protocol change.

ARTICOLO 42 — OPACITÀ PRE-REVEAL
Prima del reveal, nessuna informazione pubblicamente disponibile deve consentire di determinare o dedurre significativamente:

simbolo;

tier;

payout;

winning status;

Jackpot status.

Questo requisito riguarda anche:

datum;

metadata;

transaction structure;

commitment;

timing;

transfer;

beacon references;

backend exposure;

UI exposure.

ARTICOLO 43 — CLAIM
Il claim deve essere permissionless entro le condizioni del protocollo.

Il claimant deve dimostrare la proprietà del ticket secondo le regole on-chain.

Il claim:

può essere eseguito una sola volta;

deve utilizzare il payout congelato;

non deve richiedere autorizzazione del team;

non deve dipendere dal backend come autorità.

Lo stato:

CLAIMED
deve impedire:

CLAIMED → second payout
ARTICOLO 44 — SCADENZA
La validità economica iniziale prevista è:

almeno 365 giorni

Il ticket deve essere creato con:

issuedAt
expiresAt
e:

expiresAt >= issuedAt + minimum validity
expiresAt non deve essere ricalcolato al momento del reveal.

ARTICOLO 45 — REVEAL STORICO DOPO SCADENZA
Il protocollo può consentire:

EXPIRED
  ↓
HISTORICAL REVEAL
  ↓
WIN / LOSS
ma:

EXPIRED WIN
  ↓
NO ECONOMIC CLAIM
Il valore storico del ticket può essere conservato senza riaprire un diritto economico scaduto.

ARTICOLO 46 — ORACLE
Un oracle fornisce un dato.

Non decide la verità economica.

Quando un oracle viene utilizzato per:

conversione di prezzo;

solvibilità;

settlement;

attivazione;

devono essere definiti:

asset identity;

precision;

freshness;

authorization;

rounding;

failure behaviour.

Dati stale, mancanti, non autorizzati o incoerenti devono essere rifiutati quando necessari.

ARTICOLO 47 — RELAYER
Il relayer è un facilitatore sostituibile.

Può:

osservare;

costruire transazioni;

trasportare evidenza;

facilitare operazioni permissionless;

ricevere una ricompensa definita dalle regole.

Non può:

decidere risultati;

scegliere winner;

scegliere tier;

scegliere payout;

scegliere Jackpot;

alterare canonicalità;

sostituire una proof valida con una propria dichiarazione.

La perdita del relayer non deve trasformarlo in autorità economica.

ARTICOLO 48 — BACKEND
Il backend può:

indicizzare;

fornire UX;

costruire transazioni;

notificare;

raccogliere evidenza;

generare prove.

Non può decidere:

winner;

symbols;

tier;

payout;

randomness;

Jackpot;

claim validity;

treasury entitlement;

canonical state.

ARTICOLO 49 — BEACON E B1/B2/B3
B1
Il Beacon può essere pubblicato attraverso un percorso autorizzato.

B2
Il Beacon può essere supportato da un insieme di attestatori.

B3
Il Beacon deve derivare da stato esterno la cui canonicalità è verificata indipendentemente dal publisher.

B1 non deve essere presentato come B3.

Un publisher non deve essere confuso con la fonte della verità.

ARTICOLO 50 — MATERIOS E PROOF
Materios può fornire:

finalized state;

header;

state root;

authority data;

evidence.

La risposta RPC non costituisce automaticamente verità.

Il percorso verso B3 deve essere:

Materios
   ↓
evidence
   ↓
verification
   ↓
canonical state
   ↓
Beacon
ARTICOLO 51 — FAIL-CLOSED
Quando il protocollo non può dimostrare una condizione necessaria:

REJECT
non:

ASSUME TRUE
Non sono ammessi fallback silenziosi da:

verified path
a:

trusted fallback
quando il fallback altera il trust model.

ARTICOLO 52 — REPLAY E CONFLICT PROTECTION
Devono essere impediti:

replay di reveal;

replay di proof;

replay di beacon;

cross-round substitution;

cross-game substitution;

stale checkpoint;

duplicate canonicalization;

double claim;

conflicting root acceptance.

ARTICOLO 53 — ONE-SHOT CANONICALIZATION
Un round non può essere finalizzato due volte con root differenti, salvo una procedura di protocol upgrade esplicitamente definita e compatibile con la Costituzione.

Una canonicalizzazione valida è monotona.

ARTICOLO 54 — GOVERNANCE
La governance può modificare esclusivamente parametri governabili entro limiti costituzionali.

La governance non può:

creare un team/dev share personale;

scegliere vincitori;

assegnare manualmente il Jackpot;

cambiare un payout già cristallizzato;

invalidare ticket esistenti arbitrariamente;

disattivare la protezione delle liability;

trasformare il backend in autorità;

sostituire una proof verificata con una dichiarazione.

La governance controlla parametri.

Non controlla i singoli esiti economici.

ARTICOLO 55 — PARAMETRI COSTITUZIONALI E GOVERNABILI
Sono costituzionali almeno:

no privileged beneficiary;

on-chain economic enforcement;

liability-first accounting;

deterministic class activation;

deterministic suspension;

fixed payout after crystallisation;

single claim;

ticket transferability;

no forced burn;

Jackpot non-discretionary;

fail-closed security;

proof over authority.

Sono governabili, entro limiti:

Treasury allocation percentages;

safety reserve targets;

activation/suspension thresholds;

class exposure caps;

statistical reserve parameters;

Jackpot funding rate;

Jackpot trigger probability;

supported settlement assets;

oracle configuration;

reward parameters permissionless.

Qualunque parametro governabile deve restare compatibile con gli invarianti costituzionali.

ARTICOLO 56 — COMPATIBILITÀ ECONOMICA
Una modifica economica non può trasformare:

deterministic rule
in:

operator discretion
Non è accettabile introdurre:

class activation manuale;

payout manuale;

Jackpot manuale;

settlement basato su valore dichiarato dal browser;

liability non contabilizzate;

riserve utilizzate due volte;

esposizione non limitata.

ARTICOLO 57 — ON-CHAIN / OFF-CHAIN PARITY
Le funzioni economiche critiche devono essere coerenti tra:

TypeScript
      ↕
Plutus
      ↕
Datum
      ↕
Redeemer
      ↕
Tests
In particolare devono coincidere:

prezzi;

ladder;

payout;

reserve;

exposure;

class activation;

Jackpot;

settlement rounding;

expiry.

Una discrepanza impedisce di dichiarare il protocollo pronto.

ARTICOLO 58 — DATUM E REDEEMER
Ogni campo economicamente rilevante del datum deve avere:

uno scopo;

una regola;

un consumer;

una validazione;

un comportamento definito per ogni stato pertinente.

Il redeemer non deve consentire all'utente di dichiarare una proprietà che il validator può derivare o verificare.

ARTICOLO 59 — TEST COSTITUZIONALI
Gli invarianti costituzionali devono essere coperti da test.

Devono essere testati, ove pertinenti:

ticket binding;

commit-reveal;

domain separation;

randomness;

symbol generation;

tier;

payout;

max normal payout;

class availability;

class suspension;

hysteresis;

unresolved reserve;

deterministic exposure;

effectivePool;

Jackpot threshold;

Jackpot funding;

Jackpot winner selection;

crystallisation;

claim;

double claim;

transfer;

burn;

expiry;

historical reveal;

settlement;

oracle rejection;

beacon binding;

replay;

proof rejection.

Un requisito non testabile deve essere trattato come rischio.

ARTICOLO 60 — ADVERSARIAL MODEL
Il protocollo deve essere progettato assumendo che:

browser sia malevolo;

backend sia compromesso;

relayer sia malevolo;

adapter sia malevolo;

publisher invii dati falsi;

utente modifichi campi non vincolati;

proof venga riproposta;

reveal venga riproposto;

checkpoint siano conflittuali;

oracle sia stale;

authority set sia falso.

Il sistema deve fallire chiudendo il percorso.

ARTICOLO 61 — OPEN SOURCE E TRASPARENZA
Devono essere pubblici, quando pertinenti:

smart contracts;

specifiche;

test;

golden vectors;

proof formats;

protocol parameters;

deployment artifacts;

trust assumptions;

risultati dei PoC.

Le limitazioni della versione corrente devono essere dichiarate.

ARTICOLO 62 — PRINCIPIO DI NON REGRESSIONE
Una nuova feature non può richiedere:

weakened invariant
come prezzo per essere implementata.

In particolare non è accettabile sacrificare:

trustlessness;

fairness;

automaticity;

on-chain enforcement;

solvency;

security;

per una UX più semplice.

ARTICOLO 63 — REGOLA SUPREMA SULL'ECONOMIA
No trusted operator may have discretionary authority over user funds, user winnings, ticket-class activation or Jackpot assignment.

L'economia del protocollo deve essere determinata da:

verified state
+
deterministic rules
+
on-chain enforcement
e non da:

operator decision
ARTICOLO 64 — REGOLA SUPREMA SUL JACKPOT
Il Jackpot deve essere:

economicamente separato;

molto superiore al massimo payout normale;

progressivo a gradini;

finanziato solo dopo le priorità obbligatorie;

attivato deterministically;

assegnato attraverso randomness canonica;

non discrezionale.

La scala di riferimento è:

10×
20×
50×
100×
250×
del massimo payout normale associato alla HighestClassEverActivated.

ARTICOLO 65 — REGOLA SUPREMA SULLA SOLVIBILITÀ
Il protocollo deve sempre distinguere:

gross liquidity
da:

economically available liquidity
Una transazione non deve creare nuove obbligazioni oltre la capacità definita dalle regole di:

pending liabilities;

unresolved reserve;

deterministic exposure caps;

safety floor;

locked Jackpot;

settlement backing.

Quando una condizione di solvibilità richiesta non è soddisfatta:

REJECT
o:

SUSPEND NEW SALES
secondo lo stato previsto dal circuito di sicurezza.

ARTICOLO 66 — CRITERIO DI PRODUCTION READINESS
PRE-RICH non può essere dichiarato production-ready finché non sono soddisfatti, nella versione applicabile:

compilazione;

test;

golden vectors;

parity Plutus/TypeScript;

validazione dei datum;

validazione dei redeemer;

validazione delle policy;

validazione Treasury;

validazione PrizePool;

validazione claim;

double-claim protection;

fairness;

randomness;

solvency;

class activation/suspension;

Jackpot;

oracle settlement;

trust model;

failure paths;

revisione adversarial;

coerenza documentale.

ARTICOLO 67 — CRITERI B3
PRE-RICH può dichiararsi B3 solo quando sono dimostrati almeno:

checkpoint deterministico;

binding round/checkpoint;

finality verificata;

authority state corretto;

gestione delle authority transitions quando necessaria;

ancestry quando richiesta;

storage/state proof;

binding della proof alla state root;

binding alla chiave deterministica;

proof verificabile;

publisher independence;

conflicting-root rejection;

replay protection;

stale-proof rejection;

one-shot canonicalization;

derivazione Beacon dallo stato canonico;

economic enforcement su Cardano;

test avversariali del percorso completo.

Finché questi requisiti non sono soddisfatti:

PRE-RICH non deve dichiararsi B3.

ARTICOLO 68 — REGOLA FINALE DI COERENZA
Ogni modifica a un invariant fondamentale deve essere verificata contro:

docs/;

plutus/;

src/;

relayer/;

poc/;

scripts/;

tests;

generated artifacts.

Non è consentito aggiornare un singolo file normativo lasciando il resto del repository in contraddizione.

APPENDICE A — RIFERIMENTO ECONOMICO MINIMO
Il modello economico costituzionale minimo è:

Canonical Unit = USDM

Genesis = 1 USDM

Ticket Classes =
1 / 2 / 3 / 5 / 10 / 25 / 50 / 100 USDM

Maximum Normal Payout =
500 × Ticket Price

Effective Pool =
Total Liquidity
- Pending Liabilities
- Unresolved Reserve
- Locked Jackpot

Current Active Class =
Highest class whose post-sale state is safe

Highest Class Ever Activated =
Monotonic historical state

Jackpot Ladder =
10× / 20× / 50× / 100× / 250×
of the maximum normal payout associated
with the highest class ever activated

Safety Response =
100 → 50 → 25 → 10 → 5 → 3 → 2 → 1 → HALT
APPENDICE B — PRINCIPIO DI PROGRESSIONE
PRE-RICH non deve crescere assumendo rischio semplicemente perché il capitale lordo aumenta.

La progressione economica è:

more verified capital
        ↓
more safe exposure capacity
        ↓
higher ticket class
        ↓
higher maximum normal payout
        ↓
higher Jackpot scale
Una crescita che non aumenta la capacità economica verificata non deve automaticamente aumentare l'esposizione.

APPENDICE C — PRINCIPIO DI CONSERVAZIONE DELLE LIABILITY
Una volta creata una liability economica valida:

future liquidity changes
non devono eliminarla arbitrariamente.

Una liability cristallizzata può essere ridotta solo attraverso l'adempimento previsto:

CLAIM
o attraverso le regole di expiry applicabili prima della cristallizzazione del diritto.

APPENDICE D — PRINCIPIO DI FALLIMENTO SICURO
In ogni conflitto tra:

availability
e:

economic safety
PRE-RICH deve privilegiare:

economic safety
La mancata disponibilità di una funzione non autorizza il protocollo a inventare una verità.