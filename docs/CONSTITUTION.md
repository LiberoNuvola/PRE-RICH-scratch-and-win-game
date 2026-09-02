# PRE-RICH — COSTITUZIONE DEL PROTOCOLLO

**Versione:** Constitution V2 — Materios / B3 alignment
**Stato:** normativa fondamentale del protocollo
**Ambito:** regole, invarianti, limiti di governance e principi di sicurezza del protocollo PRE-RICH

---

# PREAMBOLO

PRE-RICH è un protocollo di gioco on-chain costruito per operare senza la necessità di affidarsi alla buona fede di un team, di un founder, di un amministratore, di un backend o di un singolo operatore per determinare la verità economica del gioco.

Il protocollo deve tendere a una proprietà fondamentale:

> **La validità del gioco deve derivare dalle regole verificabili del protocollo e dalle prove verificabili on-chain, non dalla fiducia in chi lo gestisce.**

PRE-RICH deve essere:

* 100% on-chain per le decisioni economiche e di sicurezza fondamentali;
* automatico;
* trustless;
* pubblico;
* verificabile;
* open source;
* non custodial;
* privo di una quota economica discrezionale destinata a team, developer, founder o amministratori;
* resistente alla manipolazione;
* resistente al double claim;
* resistente al risultato scelto dopo l'acquisto;
* progettato affinché nessun componente off-chain possa diventare autorità economica del protocollo.

La presente Costituzione definisce gli **invarianti fondamentali**.

Le specifiche tecniche, i PoC, il codice e i test devono implementare e dimostrare tali invarianti.

Nessuna implementazione può considerarsi conforme semplicemente perché "simile" al requisito: deve dimostrare la proprietà richiesta.

---

# ARTICOLO 1 — PRINCIPIO FONDAMENTALE DI TRUSTLESSNESS

PRE-RICH non deve richiedere fiducia in un soggetto umano per determinare:

* il risultato di un ticket;
* la randomness;
* il vincitore;
* il tier;
* il payout;
* l'attivazione del jackpot;
* la validità del claim;
* l'allocazione economica prevista dal protocollo;
* la canonicalità di uno stato esterno utilizzato dal gioco.

Un componente off-chain può:

* osservare;
* indicizzare;
* costruire transazioni;
* trasportare dati;
* produrre prove;
* fornire una UX;
* ritrasmettere una prova.

Non può decidere la verità economica.

Principio fondamentale:

> **The publisher may submit evidence. The verifier determines validity.**

E, per qualsiasi adapter esterno:

> **The adapter may observe and prove. The adapter must not decide.**

---

# ARTICOLO 2 — AUTORITÀ ON-CHAIN

Cardano costituisce il livello di enforcement economico del protocollo.

Le condizioni che determinano diritti economici devono essere verificabili dai validator e dagli asset/datum on-chain.

Il browser non è autorità.

Il backend non è autorità.

Il relayer non è autorità.

Un database off-chain non è autorità.

Un API endpoint non è autorità.

Un nodo Materios non è, da solo, autorità sufficiente per PRE-RICH.

Un provider di dati esterno non è autorità economica.

---

# ARTICOLO 3 — SEPARAZIONE TRA EVIDENZA E VERITÀ

PRE-RICH distingue formalmente tra:

1. **osservazione esterna**;
2. **evidenza crittografica**;
3. **verifica dell'evidenza**;
4. **stato canonico**;
5. **decisione economica on-chain**.

Nessun passaggio precedente può sostituire quello successivo.

In particolare:

```text
external observation
        ↓
evidence
        ↓
verification
        ↓
canonical state
        ↓
Beacon
        ↓
game derivation
        ↓
economic settlement
```

Non è consentito saltare direttamente da:

```text
external observation
        ↓
economic settlement
```

quando la sicurezza del protocollo richiede una prova intermedia.

---

# ARTICOLO 4 — STATO ATTUALE E STATO OBIETTIVO

La documentazione deve distinguere sempre tra:

* proprietà già implementate e testate;
* proprietà parzialmente implementate;
* proprietà ancora in sviluppo;
* target architetturali futuri.

In particolare:

**B1 non deve essere presentato come B3.**

PoC-0 non deve essere presentato come prova di canonicalità.

PoC-1A non deve essere presentato come finality proof completo finché l'insieme dei requisiti di finalità non è verificato.

Un componente che costituisce un passo verso B3 non conferisce automaticamente lo stato B3 all'intero protocollo.

---

# ARTICOLO 5 — TICKET

Ogni ticket PRE-RICH deve avere un'identità unica.

Il ticket è un asset/NFT trasferibile.

Il ticket:

* nasce attraverso il processo di mint autorizzato dal protocollo;
* possiede un'identità unica;
* è trasferibile;
* può essere mantenuto dopo il claim;
* può diventare un collectible storico;
* può essere volontariamente bruciato dal proprietario secondo le regole del protocollo.

Il ticket non deve essere automaticamente distrutto come condizione necessaria del claim.

Il diritto economico è associato allo stato verificabile del ticket, non all'identità dell'acquirente originale.

---

# ARTICOLO 6 — SECONDARY MARKET

Il ticket deve essere progettato per poter essere trasferito.

Un ticket non rivelato deve poter seguire una sequenza:

```text
Alice
  ↓
Bob
  ↓
Charlie
  ↓
Reveal
```

Il trasferimento non deve modificare il risultato.

Il trasferimento non deve permettere di determinare il risultato prima del reveal.

Il diritto economico, quando esistente, segue il ticket secondo le regole on-chain.

Un ticket vincente non reclamato deve poter essere trasferito, salvo eventuali limiti esplicitamente stabiliti dalle specifiche definitive.

---

# ARTICOLO 7 — PREZZO DEL TICKET

Il prezzo canonico iniziale del ticket è:

**2 USDM.**

La rappresentazione economica e l'eventuale pagamento in ADA, PRE o USDM devono essere definiti da regole verificabili.

Quando un oracle di prezzo è necessario, il valore utilizzato dal protocollo deve essere verificabile on-chain.

Il frontend può mostrare una conversione o una stima, ma la rappresentazione mostrata all'utente non costituisce prova economica.

Nessuna UI può trasformare un valore off-chain in un'autorità implicita.

---

# ARTICOLO 8 — OPACITÀ PRE-REVEAL

Prima del reveal, le informazioni pubblicamente disponibili non devono permettere di determinare o dedurre in modo significativo:

* simboli;
* tier;
* payout;
* jackpot;
* winning status.

L'invariante fondamentale è:

> **Nessuna informazione pubblicamente disponibile prima del reveal di un ticket deve consentire di determinare o dedurre in modo significativo il simbolo, il tier, il premio o l'eventuale jackpot associato a quel ticket.**

La proprietà deve essere trattata come una proprietà verificabile e testabile.

Non è sufficiente dichiararla nella documentazione.

Questo requisito comprende:

* datum;
* asset;
* token metadata;
* transaction structure;
* timing;
* transfer;
* commitment;
* beacon references;
* informazioni esposte dal backend;
* informazioni esposte dalla UI;
* dati pubblicamente osservabili sulla blockchain.

---

# ARTICOLO 9 — COMMIT-REVEAL

PRE-RICH utilizza un modello commit-reveal.

La sequenza fondamentale è:

```text
COMMIT
  ↓
LOCK / BIND
  ↓
REVEAL
  ↓
RANDOMNESS
  ↓
RESULT
```

Il player secret deve essere vincolato crittograficamente al ticket.

Il commitment deve essere legato almeno a:

* game;
* round;
* ticket identity;
* ticket nonce;
* protocol/game version;
* configurazione pertinente;
* eventuali altri parametri necessari a impedire replay o substitution.

Il reveal deve essere verificato on-chain.

Il giocatore non deve poter scegliere il risultato dopo aver osservato informazioni sufficienti a determinarlo.

---

# ARTICOLO 10 — DOMAIN SEPARATION

Ogni derivazione crittografica distinta deve utilizzare domain separation.

Le domain string devono essere:

* esplicite;
* versionate;
* stabili;
* documentate;
* condivise tra implementazione on-chain e off-chain;
* testate con golden vectors.

Una modifica della domain separation costituisce una modifica della logica del protocollo e deve essere trattata come breaking protocol change.

---

# ARTICOLO 11 — RANDOMNESS

La randomness del ticket deve essere deterministica rispetto agli input canonici ma imprevedibile prima che tali input diventino disponibili.

Il modello concettuale è:

```text
GameRoundCommitment
        +
canonical Beacon
        +
player secret / ticket commitment
        ↓
Master Random
        ↓
Symbols
        ↓
Tier
        ↓
Prize
```

La randomness deve garantire:

* forte commitment;
* reveal verificabile;
* domain separation;
* assenza di modulo bias quando applicabile;
* rejection sampling quando necessario;
* resistenza al grinding;
* impossibilità di scegliere il risultato dopo aver visto il ticket;
* impossibilità per un relayer di scegliere il risultato;
* impossibilità per un backend di scegliere il risultato;
* fallback/timeout permissionless quando previsto dall'architettura.

---

# ARTICOLO 12 — GAME ROUND COMMITMENT

Ogni round deve avere un'identità canonica.

Il GameRoundCommitment deve legare almeno:

* game identity;
* round identity;
* configuration hash;
* protocol version.

Il GameRoundCommitment non deve essere confuso con la randomness.

È un primitive di binding e integrità.

La sua funzione è impedire che dati appartenenti a game, round o configurazioni differenti vengano combinati successivamente.

---

# ARTICOLO 13 — BEACON

Il Beacon è un input critico del gioco.

Il Beacon non deve essere trattato come semplice dato fornito da un operatore.

Il protocollo distingue:

### B1

Beacon derivato da dati esterni pubblicati attraverso un percorso autorizzato.

B1 mantiene una componente di fiducia nell'autorità che pubblica l'evidenza.

### B2

Beacon supportato da un insieme di attestatori/comitato.

B2 elimina la dipendenza da un singolo publisher ma conserva un trust assumption sul comitato.

### B3

Beacon derivato esclusivamente da stato esterno la cui canonicalità è verificata indipendentemente dal publisher.

B3 è il target architetturale di PRE-RICH.

---

# ARTICOLO 14 — DEFINIZIONE DI B3

B3 non significa semplicemente:

```text
un relayer ha pubblicato un root
```

né:

```text
un nodo Materios dice "finalized"
```

né:

```text
un publisher ha firmato il root
```

B3 richiede concettualmente:

```text
Unique Anchor
        AND
Publisher-Independent Canonicality
        AND
On-Chain Verifiable Proof
```

Per un riferimento esterno `ref` e root `root`:

```text
Checkpoint(round) → ref

Canonical(ref, root)

VerifyCanonical(ref, root, proof) = true
```

Il publisher non deve poter scegliere quale root diventa canonico.

---

# ARTICOLO 15 — CANONICAL CHECKPOINT

Il checkpoint canonico deve essere deterministico.

La funzione di checkpoint deve essere definita da regole versionate che stabiliscano, ove pertinenti:

* network/genesis identity;
* round;
* checkpoint reference;
* domain separator;
* encoding;
* protocol version;
* finality rule;
* stale/timeout behavior.

Il concetto:

```text
finalized_head_at_query_time
```

è sufficiente come evidenza PoC-0, ma non costituisce da solo la definizione finale di canonicalità B3.

La canonicalità deve essere legata a un checkpoint determinabile indipendentemente dal soggetto che presenta la prova.

---

# ARTICOLO 16 — MATERIOS

Materios può fornire lo stato esterno utilizzato dal protocollo.

PRE-RICH non deve però assumere che:

```text
Materios RPC response = truth
```

L'architettura deve poter evolvere verso:

```text
Materios
   ↓
finalized state
   ↓
consensus/finality evidence
   ↓
state/storage evidence
   ↓
proof
   ↓
Cardano verifier
   ↓
canonical anchor
```

L'integrazione con Materios deve pertanto essere considerata una fonte di dati/evidenza, non una delega dell'autorità economica.

---

# ARTICOLO 17 — ADAPTER ESTERNO A MATERIOS

L'adapter esterno PRE-RICH può:

* interrogare Materios;
* recuperare header;
* recuperare state root;
* recuperare authority state;
* recuperare finality evidence;
* recuperare storage proof;
* decodificare SCALE;
* costruire prove;
* produrre artefatti verificabili.

L'adapter non deve essere trusted per la correttezza del risultato.

Un adapter compromesso deve poter al massimo produrre:

```text
invalid evidence
```

che il verifier deve rifiutare.

Non deve poter produrre:

```text
invalid evidence accepted as canonical truth
```

---

# ARTICOLO 18 — PoC-0

PoC-0 è un componente di evidence extraction.

PoC-0 dimostra che è possibile ottenere da Materios dati quali:

* finalized head;
* header;
* block hash;
* state root;
* runtime version;
* GRANDPA authorities;
* GRANDPA set ID;
* authority commitment;
* CanonicalCheckpoint.

PoC-0 non costituisce:

* prova indipendente di finalità;
* prova di canonicalità;
* storage proof;
* B3;
* fairness oracle.

Il suo ruolo è fornire l'evidenza necessaria alle fasi successive.

---

# ARTICOLO 19 — PoC-1 / GRANDPA

La verifica GRANDPA deve essere indipendente dal nodo Materios interrogato.

Un verifier non deve semplicemente chiedere al nodo:

> "questo blocco è finalizzato?"

Deve verificare l'evidenza crittografica fornita.

La verifica deve comprendere, secondo la specifica definitiva:

* chain identity;
* genesis identity;
* authority set corretto;
* set ID;
* target hash;
* target block number;
* signer identity;
* firma;
* authority weight;
* quorum;
* round;
* eventuale ancestry necessaria;
* transizioni di authority set quando richieste.

Il quorum GRANDPA deve essere verificato matematicamente.

La condizione di quorum è:

```text
3 × signedWeight > 2 × totalWeight
```

e non deve essere implementata attraverso floating point o approssimazioni.

---

# ARTICOLO 20 — CRYPTOGRAPHIC ALGORITHM BINDING

L'algoritmo crittografico effettivamente utilizzato dal consenso Materios deve essere derivato dalla specifica/codice reale del consenso e non da supposizioni.

La verifica attualmente esplorata nel PoC-1A utilizza Ed25519.

Qualsiasi implementazione definitiva deve mantenere una corrispondenza verificata tra:

```text
Materios runtime
        ↕
PoC decoder
        ↕
crypto verifier
        ↕
future Cardano verifier
```

Una sostituzione arbitraria di Ed25519 con un altro schema non è ammessa senza nuova verifica della compatibilità.

---

# ARTICOLO 21 — AUTHORITY STATE

Un verifier deve distinguere tra:

* authority state osservato dal relayer;
* authority state trusted;
* authority state dimostrato.

PoC-1A può utilizzare un `TrustedAuthorityState` come fase intermedia di sviluppo.

Questo non equivale ancora a B3.

Il percorso verso B3 deve eliminare progressivamente la necessità di affidarsi a un'autorità off-chain per sapere quale authority set sia canonico.

---

# ARTICOLO 22 — ANCESTRY

Una firma GRANDPA valida e un quorum valido non devono essere automaticamente considerati sufficienti quando la verifica richiede anche una prova di ancestry.

Il verifier deve fallire chiudendo il percorso quando i dati necessari all'ancestry non sono disponibili o verificabili.

Non è consentito trasformare un controllo non implementato in un controllo implicitamente "vero".

Principio:

> **Missing proof means rejection, not assumption.**

---

# ARTICOLO 23 — STORAGE PROOF E STATO CANONICO

Per raggiungere B3, la finalità del blocco non è sufficiente.

È necessario dimostrare che lo stato utilizzato dal gioco contiene effettivamente l'oggetto previsto.

Il proof statement deve legare almeno:

```text
roundId
checkpointRef
stateRoot
deterministic key
expected state value
proof
```

La chiave deve essere deterministica e domain-separated.

Concettualmente:

```text
K =
H(
  "PRE-RICH/MATERIOS/BEACON/V1"
  ||
  roundId
  ||
  checkpointRef
)
```

Il proof deve dimostrare l'inclusione del valore associato a tale chiave nello stato canonico.

---

# ARTICOLO 24 — CANONICAL BEACON ANCHOR

Il risultato verificato deve essere trasformato in un'ancora canonica on-chain.

L'ancora deve legare almeno:

* round;
* checkpoint reference;
* root;
* context;
* commitment/proof reference;
* stato di finalizzazione.

L'ancora deve impedire:

* conflicting root;
* replay;
* stale proof;
* wrong round;
* wrong checkpoint;
* wrong target;
* second finalization;
* sostituzione arbitraria del root.

Una volta finalizzata l'ancora, il Beacon del round deve derivare esclusivamente dai dati canonici verificati.

---

# ARTICOLO 25 — BEACON NON È L'ORACLE DELLA FAIRNESS

Il Beacon non è un'autorità umana.

Il relayer può trasportare il Beacon.

Il relayer non può scegliere il Beacon.

Il backend può mostrare il Beacon.

Il backend non può scegliere il Beacon.

L'adapter può derivare una prova.

L'adapter non può scegliere quale stato è vero.

La fairness nasce dalla combinazione verificabile di:

```text
canonical round
+
canonical external state
+
verified proof
+
player commitment
+
player reveal
```

---

# ARTICOLO 26 — DERIVAZIONE DEI SIMBOLI

I simboli devono essere derivati deterministicamente dagli input canonici.

Le derivazioni devono essere domain-separated.

Il set di cinque simboli normali rimane:

```text
1 2 3 4 5
```

Il protocollo non deve consentire a frontend, backend o relayer di fornire direttamente i simboli come dato autorevole.

Il validator deve essere in grado di ricalcolare il risultato.

---

# ARTICOLO 27 — TIER

Il tier deve essere derivato dal vector dei simboli attraverso le Game Rules canoniche.

Il risultato non deve essere accettato sulla base di:

```text
user supplied tier
backend supplied tier
relayer supplied tier
receipt supplied tier
```

quando tale valore può essere ricavato on-chain dagli input verificati.

Il tier deve essere una conseguenza delle regole, non un parametro arbitrario.

---

# ARTICOLO 28 — JACKPOT

Il jackpot deve essere una proprietà del protocollo, non una decisione amministrativa.

La sua eventuale attivazione deve essere determinata da condizioni on-chain.

Concettualmente:

```text
effectivePool >= jackpotThreshold
        ↓
jackpot active
```

La selezione del ticket jackpot deve derivare dalla randomness canonica.

Nessun backend può:

* attivare il jackpot;
* scegliere il ticket;
* assegnare il jackpot;
* modificare retroattivamente il jackpot.

Finché l'intero meccanismo non è implementato e verificato on-chain, il jackpot deve essere considerato una proprietà normativa/target e non una feature già conclusa.

---

# ARTICOLO 29 — LIQUIDITÀ E EFFECTIVE POOL

Il protocollo deve distinguere tra:

```text
TOTAL POOL
```

e:

```text
EFFECTIVE LIQUIDITY
```

La liquidità disponibile non è semplicemente il valore grezzo di un UTxO.

Devono essere considerate almeno:

* pending winning liabilities;
* unresolved-ticket reserve;
* obbligazioni economiche già cristallizzate;
* vincoli di solvibilità del protocollo.

Un importo già promesso a un giocatore non deve essere considerato nuovamente come liquidità liberamente disponibile.

`effectivePool` deve diventare una quantità verificabile e non una semplice variabile calcolata dal frontend.

---

# ARTICOLO 30 — PRIZE CALCULATION

Il premio viene determinato al reveal.

La sequenza normativa è:

```text
Reveal
  ↓
Symbols
  ↓
Tier
  ↓
Effective Pool
  ↓
Payout
  ↓
Payout Frozen
```

Il claim non deve ricalcolare un nuovo premio sulla base dello stato economico futuro del protocollo.

Il claim deve utilizzare il payout già cristallizzato.

---

# ARTICOLO 31 — FLOOR DEL PREMIO

Il minimo economico previsto dal modello iniziale è:

**2 USDM.**

Il floor deve essere compatibile con le regole di solvibilità.

Il protocollo non deve promettere un payout che non possa essere sostenuto dalle regole on-chain definitive.

Il floor non deve essere implementato come una semplice promessa UI.

---

# ARTICOLO 32 — PAYOUT CRISTALLIZZATO

Al reveal devono essere fissati on-chain:

* result;
* tier;
* payout;
* claimability;
* expiry;
* eventuali dati economici necessari alla verifica storica.

Dopo la cristallizzazione:

```text
future pool changes
```

non devono modificare il payout già assegnato.

Questo impedisce che il giocatore abbia un incentivo economico a ritardare il claim per cercare condizioni future migliori.

---

# ARTICOLO 33 — STATO DEL TICKET

Il modello economico fondamentale è:

```text
UNREVEALED
     ↓
REVEALED
     ↓
CLAIMED
```

Il risultato può essere:

```text
WIN
LOSS
```

Un loss è uno stato verificabile, non un ticket inesistente.

Lo stato `CLAIMED` deve impedire ogni secondo pagamento.

Il protocollo deve impedire:

```text
CLAIMED → second payout
```

on-chain.

---

# ARTICOLO 34 — CLAIM

Il claim è permissionless entro le condizioni definite dal protocollo.

Il diritto economico deve essere determinato dal ticket e dal suo stato on-chain.

Il claimant deve dimostrare la proprietà del ticket secondo le regole on-chain.

Il claim:

* può essere eseguito una sola volta;
* deve utilizzare il payout congelato;
* non deve dipendere da una decisione manuale;
* non deve richiedere autorizzazione del team.

---

# ARTICOLO 35 — NFT DOPO IL CLAIM

Il claim non deve obbligatoriamente distruggere il ticket.

Il ticket può diventare:

```text
game asset
+
proof/history
+
collectible
```

Un ticket vincente può conservare informazioni storiche verificabili.

La distruzione volontaria dell'NFT non deve creare automaticamente un nuovo diritto economico.

---

# ARTICOLO 36 — BURN

Il proprietario può eventualmente scegliere:

```text
CLAIM
+
KEEP NFT
```

oppure:

```text
CLAIM
+
BURN NFT
```

Il burn non costituisce di per sé un claim.

Un ticket vincente non deve poter essere accidentalmente bruciato prima che il diritto economico sia stato correttamente gestito, quando ciò sia tecnicamente impedibile senza violare gli altri principi del protocollo.

---

# ARTICOLO 37 — SCADENZA

La durata iniziale prevista è:

**almeno 365 giorni.**

La scadenza deve essere fissata alla creazione:

```text
issuedAt
expiresAt = issuedAt + minimum validity
```

`expiresAt` non deve essere ricalcolato al reveal.

La scadenza rappresenta principalmente il termine del diritto economico, non necessariamente la cancellazione del ticket dalla storia del protocollo.

---

# ARTICOLO 38 — REVEAL STORICO DOPO LA SCADENZA

Il protocollo può consentire il reveal storico dopo la scadenza.

Il modello desiderato è:

```text
expired ticket
      ↓
historical reveal
      ↓
WIN / LOSS
```

ma:

```text
expired winning ticket
      ↓
no economic claim
```

Il risultato storico deve poter essere verificato senza riaprire un diritto economico scaduto.

---

# ARTICOLO 39 — TREASURY

Tutte le entrate economiche del protocollo devono entrare direttamente nel sistema Treasury/PrizePool previsto dal protocollo.

Non deve esistere:

```text
User
 ↓
Team
 ↓
Treasury
```

La struttura deve essere:

```text
User
 ↓
Protocol treasury
 ↓
Protocol-controlled categories
```

Non deve esistere una quota economica personale per:

* team;
* founder;
* developer;
* administrator.

---

# ARTICOLO 40 — MAINTENANCE

La maintenance è una categoria del protocollo.

Non è:

```text
team wallet
```

Non può essere trasformata in una quota discrezionale personale attraverso una semplice modifica della UI o del backend.

Qualunque destinazione economica definitiva deve essere verificabile attraverso le regole on-chain.

---

# ARTICOLO 41 — TREASURY DISTRIBUTION

La distribuzione deve essere automatica e deterministica.

Il modello iniziale documentato prevede percentuali configurabili per:

* Prize;
* Stake;
* Reserve;
* Relayer reward.

I valori effettivi sono parametri operativi e non devono essere confusi con gli invarianti costituzionali.

Il relayer reward è una ricompensa per l'esecuzione di una funzione permissionless/automatizzata e non costituisce una quota di proprietà del protocollo.

---

# ARTICOLO 42 — RELAYER

Il relayer è un facilitatore.

Può:

* osservare il Treasury;
* osservare le condizioni operative;
* costruire transazioni;
* pubblicare evidenza;
* eseguire operazioni automatiche previste dal protocollo;
* ricevere una ricompensa definita dalle regole.

Non può:

* decidere il risultato;
* scegliere il winner;
* scegliere il tier;
* scegliere il payout;
* scegliere il jackpot;
* alterare la randomness;
* sostituire una prova con una propria dichiarazione;
* modificare arbitrariamente la canonicalità.

Il relayer deve poter fallire senza compromettere la verità economica del protocollo.

---

# ARTICOLO 43 — BACKEND

Il backend può essere utilizzato per:

* indicizzazione;
* UX;
* caching;
* costruzione di transazioni;
* notifiche;
* facilitazione di reveal;
* facilitazione di claim;
* raccolta di evidenze;
* generazione di prove.

Il backend non è autorità per:

* winner;
* symbols;
* tier;
* payout;
* randomness;
* jackpot;
* treasury allocation;
* claim validity;
* canonical state.

La perdita completa del backend non deve rendere falso lo stato on-chain.

---

# ARTICOLO 44 — ORACLE

Un oracle esterno può fornire informazioni necessarie al protocollo, per esempio dati di prezzo.

Tuttavia:

```text
oracle data
```

non deve diventare automaticamente:

```text
economic truth
```

Il dato deve essere verificato secondo le regole del protocollo.

L'utilizzo definitivo di un oracle per conversioni economiche richiede binding on-chain e test coerenti con l'invariante.

---

# ARTICOLO 45 — ORYNQ

Orynq può essere utilizzato come livello di audit, proof bundle e dispute resolution.

Può fornire evidenza relativa a:

* ticket;
* receipt;
* transaction hashes;
* commitment;
* reveal;
* result;
* Materios batch root;
* proof digest.

Orynq non costituisce autorità economica finale.

Una prova Orynq non deve poter sostituire una verifica on-chain richiesta dal protocollo.

---

# ARTICOLO 46 — RECEIPT

Una receipt deve essere legata al ticket corretto.

Gli elementi rilevanti devono essere crittograficamente coerenti con:

* ticketId;
* purchase transaction;
* commitment;
* reveal;
* game version;
* result;
* eventuale Materios root/context;
* proof digest.

Una receipt può essere una prova/audit artifact.

Non deve diventare una scorciatoia per accettare dati non verificati.

---

# ARTICOLO 47 — DETERMINISTIC ENCODING

Qualunque dato utilizzato in una derivazione crittografica deve avere un encoding canonico.

Devono essere definiti:

* ordine dei campi;
* lunghezze;
* encoding integer;
* byte order;
* domain separator;
* versioning;
* representation of empty values.

L'implementazione TypeScript e l'implementazione Plutus devono produrre lo stesso digest.

Golden vectors devono essere utilizzati per impedire divergenze silenziose.

---

# ARTICOLO 48 — ON-CHAIN / OFF-CHAIN PARITY

Nessuna funzione economica critica deve avere due interpretazioni differenti.

Devono essere coerenti almeno:

```text
TypeScript
      ↕
Plutus
      ↕
Datum
      ↕
Redeemer
      ↕
Tests
```

Se esiste una discrepanza, il protocollo non deve essere dichiarato pronto.

---

# ARTICOLO 49 — FALLIMENTO SICURO

PRE-RICH deve preferire:

```text
reject
```

a:

```text
accept uncertain data
```

Quando una prova richiesta non è disponibile, valida o sufficientemente determinata:

**la transazione deve fallire.**

Un timeout non deve diventare una licenza per accettare dati non verificati.

Un errore del relayer non deve diventare un'autorità implicita.

Un errore del backend non deve diventare una decisione economica.

---

# ARTICOLO 50 — REPLAY PROTECTION

Ogni proof, reveal, beacon, round e claim deve essere vincolato al proprio contesto.

Devono essere impediti:

* replay di reveal;
* replay di proof;
* replay di beacon;
* cross-round substitution;
* cross-game substitution;
* stale checkpoint;
* duplicate canonicalization;
* double claim.

---

# ARTICOLO 51 — ONE-SHOT CANONICALIZATION

Un round non deve poter essere finalizzato due volte con root differenti.

La transizione canonica deve essere monotona:

```text
Pending
   ↓
Ready / Canonical
```

e non:

```text
Canonical A
   ↓
Canonical B
```

salvo una procedura di protocol upgrade esplicitamente definita dalla governance e compatibile con questa Costituzione.

---

# ARTICOLO 52 — CONFLICTING ROOTS

Se esistono due root concorrenti per lo stesso checkpoint, il protocollo non deve scegliere arbitrariamente il primo pubblicato.

Il primo publisher non costituisce prova di canonicalità.

La regola fondamentale è:

> **Uniqueness is necessary, but uniqueness alone is not sufficient.**

B3 richiede una proprietà indipendente di canonicalità.

---

# ARTICOLO 53 — GOVERNANCE

La governance può modificare parametri operativi ed economici entro limiti costituzionali.

La governance non può trasformare PRE-RICH in un protocollo che violi i suoi principi fondamentali.

In particolare non può introdurre:

* team/dev treasury share;
* custodia centralizzata dei fondi;
* risultato deciso da amministratore;
* jackpot assegnato manualmente;
* payout modificabile arbitrariamente dopo il reveal;
* doppio claim;
* dipendenza obbligatoria da backend fiduciario;
* canonicalità determinata da un singolo publisher quando B3 è richiesto;
* violazione deliberata dell'opacità pre-reveal.

---

# ARTICOLO 54 — PARAMETRI GOVERNABILI E PARAMETRI COSTITUZIONALI

Devono essere separati:

### Parametri costituzionali

Principi non modificabili senza una modifica costituzionale esplicita.

Esempi:

* trustlessness;
* on-chain economic enforcement;
* no discretionary team share;
* no trusted backend;
* commit-reveal fairness;
* single claim;
* proof over authority;
* fail-closed security;
* publisher-independent canonicality come target B3.

### Parametri governabili

Esempi:

* percentuali Treasury;
* threshold;
* reward relayer;
* configurazioni operative;
* prize table entro i limiti consentiti;
* tempi e parametri economici compatibili con gli invarianti.

---

# ARTICOLO 55 — OPEN SOURCE E VERIFICABILITÀ

Il protocollo deve essere pubblicamente verificabile.

Devono essere pubblici, quando pertinenti:

* smart contracts;
* specifiche;
* test;
* golden vectors;
* proof formats;
* protocol parameters;
* deployment artifacts;
* documentazione dei trust assumptions;
* risultati dei PoC.

La documentazione non deve nascondere le limitazioni dell'implementazione corrente.

---

# ARTICOLO 56 — POС COME PROCESSO DI VERIFICA

I PoC non sono semplici demo.

Ogni PoC deve rispondere a una domanda di sicurezza precisa.

Il percorso B3 può essere articolato in fasi quali:

```text
PoC-0
Materios evidence extraction

        ↓

PoC-1
GRANDPA finality verification

        ↓

PoC-2
State/storage proof

        ↓

PoC-3
Complete canonicality proof

        ↓

PoC-4
Succinct proof / Cardano verification

        ↓

B3
Canonical external state enforced by Cardano
```

Ogni fase deve avere criteri di PASS/FAIL espliciti.

---

# ARTICOLO 57 — PROOF-CARRYING CHECKPOINT

L'architettura futura può utilizzare un checkpoint accompagnato da prove verificabili.

Il checkpoint deve poter contenere o riferire:

* chain identity;
* genesis identity;
* block number;
* block hash;
* state root;
* consensus authority state;
* finality evidence;
* application state evidence;
* protocol version.

Il checkpoint non diventa canonico perché è stato prodotto.

Diventa canonico solo quando il proof system previsto dal protocollo lo dimostra.

---

# ARTICOLO 58 — PROOF GENERATOR

Il proof generator può essere completamente off-chain.

Può:

* interrogare RPC;
* scaricare header;
* verificare finality;
* processare authority sets;
* decodificare SCALE;
* costruire storage proofs;
* costruire succinct proofs.

Il proof generator non è trusted.

La sua unica autorità è produrre una prova che deve essere verificata.

Un proof generator corrotto deve poter produrre solo:

```text
proof accepted
```

quando la prova è effettivamente valida.

In caso contrario:

```text
proof rejected
```

---

# ARTICOLO 59 — CARDANO COME VERIFIER FINALE

Il target architetturale è che la verifica necessaria per la decisione economica possa essere effettuata sul livello Cardano secondo un verifier verificabile.

Quando una prova succinta è necessaria per rispettare i limiti computazionali, la succintezza non deve ridurre la proprietà verificata.

La complessità può essere spostata off-chain.

La fiducia non può essere spostata off-chain.

---

# ARTICOLO 60 — PRINCIPIO DI MINIMA FIDUCIA

Ogni componente deve essere classificato secondo il trust assumption che introduce.

Categorie minime:

```text
Trusted
Semi-trusted
Untrusted
Cryptographically verified
On-chain enforced
```

Nessun documento può chiamare "trustless" un percorso che contiene ancora una dipendenza fiduciaria non dichiarata.

Il trust model deve essere esplicito.

---

# ARTICOLO 61 — B1, B2 E B3 DEVONO ESSERE DICHIARATI

Ogni implementazione del Beacon deve dichiarare chiaramente il proprio livello.

### B1

Publisher/relayer trusted per la pubblicazione.

### B2

Committee trusted per l'attestazione.

### B3

Canonicality verificata indipendentemente dal publisher.

Non è consentito chiamare B1 "B3-ready" senza indicare quali proprietà B3 mancano.

---

# ARTICOLO 62 — TEST COME PARTE DELLA COSTITUZIONE

Gli invarianti fondamentali devono avere test.

Devono essere testati, quando applicabili:

* commitment;
* reveal;
* domain separation;
* randomness;
* symbol generation;
* tier classification;
* payout;
* floor;
* expiry;
* historical reveal;
* claim;
* double claim;
* transfer;
* pre-reveal opacity;
* beacon binding;
* checkpoint binding;
* GRANDPA signatures;
* authority membership;
* authority weight;
* quorum;
* ancestry;
* storage inclusion;
* proof rejection;
* conflicting roots;
* replay;
* stale proofs.

Un requisito non testabile deve essere trattato come rischio architetturale.

---

# ARTICOLO 63 — ADVERSARIAL TESTING

Il protocollo deve essere testato assumendo che:

* il browser sia malevolo;
* il backend sia compromesso;
* il relayer sia malevolo;
* l'adapter sia malevolo;
* il publisher invii dati falsi;
* un utente modifichi ogni campo non vincolato;
* vengano riproposti proof/reveal già utilizzati;
* vengano forniti checkpoint differenti;
* venga fornito un authority set falso;
* vengano manipolati weight;
* vengano fornite firme invalide;
* vengano presentati signer duplicati;
* venga presentato un root concorrente;
* venga presentato uno stato stale.

Il sistema deve fallire chiudendo il percorso.

---

# ARTICOLO 64 — DIVIETO DI TRUST BY CONVENIENCE

Non è accettabile introdurre un componente trusted semplicemente perché:

* è più facile da implementare;
* riduce il costo di una transazione;
* rende la UX più semplice;
* evita di implementare una proof;
* rende il PoC più veloce.

Una semplificazione può essere utilizzata durante un PoC solo se il trust assumption viene esplicitamente dichiarato e non viene confuso con la sicurezza definitiva.

---

# ARTICOLO 65 — COMPATIBILITÀ

Le evoluzioni del protocollo devono preservare le proprietà già dimostrate.

Una nuova implementazione non deve eliminare:

* domain separation;
* ticket binding;
* commit-reveal;
* deterministic derivation;
* single claim;
* NFT preservation;
* fail-closed behavior;

solo per semplificare una nuova feature.

Le modifiche devono essere valutate rispetto agli invarianti esistenti.

---

# ARTICOLO 66 — NO SILENT FALLBACK

Un componente non deve passare automaticamente da:

```text
verified path
```

a:

```text
trusted fallback
```

senza che il trust model lo preveda esplicitamente.

In particolare non è ammesso:

```text
proof verification failed
        ↓
use relayer value instead
```

né:

```text
oracle unavailable
        ↓
use browser value
```

né:

```text
canonical proof unavailable
        ↓
use first submitted root
```

---

# ARTICOLO 67 — STORIA DEL TICKET

Il protocollo deve poter conservare la storia verificabile del ticket.

La storia può comprendere:

* emissione;
* trasferimenti;
* reveal;
* win/loss;
* payout;
* claim;
* expiry;
* burn volontario.

La storia non deve essere alterabile retroattivamente attraverso dati off-chain.

---

# ARTICOLO 68 — PRIVACY E MINIMA ESPOSIZIONE

PRE-RICH non deve pubblicare prima del reveal dati non necessari che consentano di ridurre l'entropia del risultato.

Quando un'informazione non è necessaria on-chain prima del reveal, deve essere considerata candidata alla protezione tramite commitment o altro meccanismo appropriato.

La trasparenza del protocollo non significa esposizione anticipata del risultato.

---

# ARTICOLO 69 — ECONOMIC SAFETY

Il protocollo non deve creare liability non contabilizzate.

Ogni payout cristallizzato deve essere trattato come obbligazione economica.

La gestione del PrizePool deve evolvere verso un modello nel quale la liquidità effettivamente spendibile sia distinta dalle obbligazioni già esistenti.

Una transazione che violi la solvibilità deve essere rifiutata.

---

# ARTICOLO 70 — AUTOMAZIONE

PRE-RICH deve essere progettato per funzionare automaticamente.

Le operazioni ricorrenti non devono richiedere un amministratore.

L'automazione può essere eseguita da:

* relayer;
* keeper;
* bot;
* servizi esterni.

Ma tali componenti devono essere sostituibili.

La perdita di un singolo relayer non deve bloccare permanentemente il diritto economico degli utenti quando l'operazione può essere resa permissionless.

---

# ARTICOLO 71 — SOSTITUIBILITÀ DEGLI OPERATORI

Un relayer è un ruolo, non un'identità privilegiata permanente.

Un futuro design B3 dovrebbe consentire che più soggetti possano:

* produrre prove;
* trasmettere prove;
* facilitare transazioni.

La correttezza deve derivare dalla prova, non dall'identità dell'operatore.

---

# ARTICOLO 72 — NESSUN SINGLE POINT OF TRUST

Il protocollo deve progressivamente eliminare:

* single publisher;
* single relayer;
* single backend;
* single oracle operator;
* single proof generator.

Quando un single point non può essere ancora eliminato, deve essere dichiarato nel trust model e classificato come limite della versione corrente.

---

# ARTICOLO 73 — DEFINIZIONE DI "TRUSTLESS"

Per PRE-RICH, "trustless" non significa che nessun soggetto esterno esista.

Significa:

> **nessun soggetto esterno deve essere creduto sulla parola quando la sua affermazione può essere sostituita da una prova verificabile.**

Un soggetto può produrre dati.

Un soggetto può produrre prove.

Un soggetto può pagare il costo della transazione.

Ma la verità economica deve essere determinata dalle regole verificabili del protocollo.

---

# ARTICOLO 74 — REGOLA SUPREMA SULLA CANONICALITÀ

La frase fondamentale del modello B3 è:

> **The publisher may submit evidence. The publisher must not choose truth.**

Corollario:

> **The adapter may observe and prove. The adapter must not decide.**

Corollario finale:

> **Only verifiable canonical state may influence the canonical Beacon.**

---

# ARTICOLO 75 — REGOLA SUPREMA SULLA FAIRNESS

La frase fondamentale della fairness è:

> **Nessuna informazione pubblicamente disponibile prima del reveal deve consentire di determinare o dedurre significativamente il risultato del ticket.**

La proprietà deve essere dimostrata mediante test e analisi avversariali.

---

# ARTICOLO 76 — REGOLA SUPREMA SULL'ECONOMIA

La frase fondamentale dell'economia è:

> **No trusted operator may have discretionary authority over user funds or user winnings.**

Il protocollo deve determinare automaticamente:

* raccolta;
* allocazione;
* payout;
* claim;
* expiry;
* distribuzione.

---

# ARTICOLO 77 — REGOLA SUPREMA SULLA SICUREZZA

Quando il protocollo non riesce a dimostrare una condizione necessaria:

```text
REJECT
```

non:

```text
ASSUME TRUE
```

La sicurezza prevale sulla disponibilità.

---

# ARTICOLO 78 — CRITERI DI PRODUZIONE

PRE-RICH non può essere dichiarato production-ready finché non sono soddisfatti, secondo la versione del protocollo:

1. compilazione completa;
2. test completi;
3. golden vectors;
4. parity Plutus/TypeScript;
5. assenza di secret/API key nel frontend;
6. verifica dei validator;
7. verifica dei datum;
8. verifica delle policy;
9. verifica del Treasury;
10. verifica del claim;
11. verifica del double-claim protection;
12. verifica della fairness;
13. verifica del Beacon;
14. verifica del trust model;
15. verifica dei proof paths;
16. verifica dei failure paths;
17. revisione adversarial;
18. coerenza documentale.

Nessun singolo PoC sostituisce questo processo.

---

# ARTICOLO 79 — CRITERI B3

PRE-RICH può dichiarare B3 solo quando sono dimostrati tutti gli elementi necessari del percorso definitivo, inclusi almeno:

1. checkpoint deterministico;
2. binding round/checkpoint;
3. finality verificata;
4. authority state corretto;
5. gestione delle authority transitions quando necessaria;
6. ancestry verificata quando richiesta;
7. state/storage proof verificata;
8. binding del proof alla state root;
9. binding alla chiave deterministica;
10. proof verificabile;
11. publisher independence;
12. conflicting-root rejection;
13. replay protection;
14. stale-proof rejection;
15. one-shot canonicalization;
16. derivazione Beacon esclusivamente dallo stato canonico;
17. enforcement economico sul livello Cardano;
18. test avversariali del percorso completo.

Finché questi requisiti non sono soddisfatti:

> **PRE-RICH non deve dichiararsi B3.**

---

# ARTICOLO 80 — EVOLUZIONE VERSO B3

L'evoluzione del protocollo deve seguire il principio:

```text
B1
 ↓
verified evidence
 ↓
B2-capable evidence
 ↓
cryptographic finality
 ↓
state proof
 ↓
succinct proof
 ↓
Cardano verification
 ↓
B3
```

Ogni fase deve ridurre il trust assumption.

Nessuna fase deve essere descritta come trustless se introduce una nuova autorità senza dichiararla.

---

# ARTICOLO 81 — PRINCIPIO DI NON REGRESSIONE

Una modifica tecnica non può essere accettata se:

```text
new feature
```

richiede:

```text
weakened invariant
```

senza una modifica costituzionale esplicita.

In particolare non è accettabile sacrificare:

* trustlessness;
* fairness;
* on-chain enforcement;
* automaticity;
* security;

per ottenere una UX più semplice.

---

# ARTICOLO 82 — GERARCHIA DELLA DOCUMENTAZIONE

La gerarchia normativa è:

```text
CONSTITUTION
      ↓
SPECIFICATIONS
      ↓
IMPLEMENTATION
      ↓
TESTS / PROOFS
```

La Costituzione stabilisce **cosa deve essere vero**.

Le specifiche stabiliscono **come deve essere ottenuto**.

Il codice implementa.

I test e le prove dimostrano.

Una specifica non può autorizzare una violazione della Costituzione.

---

# ARTICOLO 83 — REPOSITORY CONSISTENCY

Ogni modifica a un invariant fondamentale deve essere verificata contro tutti i componenti interdipendenti:

* `docs/`;
* `poc/`;
* `plutus/`;
* `src/`;
* `relayer/`;
* `scripts/`;
* test;
* compiled artifacts.

Non è consentito aggiornare un singolo documento lasciando il resto del repository in contraddizione.

---

# ARTICOLO 84 — REGOLA PER I DATUM

Non devono essere introdotti campi nel datum semplicemente perché sono convenienti per il frontend.

Ogni campo economicamente rilevante deve avere:

* una ragione;
* un'invariante;
* un consumer;
* una regola di validazione;
* un comportamento definito in ogni stato.

I dati non necessari non devono diventare nuove superfici di attacco.

---

# ARTICOLO 85 — REGOLA PER I REDEEMER

Un redeemer non deve essere utilizzato per permettere all'utente di dichiarare una proprietà che il validator può calcolare o verificare.

Esempio non valido:

```text
Reveal {
    symbols = userProvidedSymbols
}
```

quando il validator può derivare i simboli.

Il redeemer deve fornire solo l'informazione necessaria all'azione.

---

# ARTICOLO 86 — REGOLA PER LE RECEIPT ESTERNE

Una receipt esterna può attestare che un sistema esterno ha osservato qualcosa.

Non può trasformare automaticamente quell'osservazione in verità economica.

La catena deve verificare almeno:

```text
identity
+
binding
+
proof
+
canonical context
```

prima di attribuire significato economico al dato.

---

# ARTICOLO 87 — REGOLA PER IL FRONTEND

Il frontend è una superficie di presentazione e costruzione di transazioni.

Non è una superficie di consenso.

Il frontend può:

* mostrare;
* calcolare una previsione;
* preparare una transazione;
* facilitare l'utente.

Il frontend non può:

* stabilire il winner;
* stabilire il payout;
* stabilire il jackpot;
* stabilire il Beacon;
* stabilire la validità del claim.

---

# ARTICOLO 88 — TRASPARENZA DEI LIMITI

Ogni componente sperimentale deve dichiarare chiaramente:

* cosa verifica;
* cosa non verifica;
* quali dati considera trusted;
* quali dati considera untrusted;
* quale trust assumption rimane;
* quale fase B1/B2/B3 rappresenta.

La trasparenza sui limiti è parte della sicurezza.

---

# ARTICOLO 89 — PRINCIPIO DI CONSERVAZIONE DELLE PROPRIETÀ

Quando una parte del sistema viene sostituita, le proprietà già garantite devono essere conservate.

In particolare:

```text
old verified invariant
        ↓
new implementation
```

deve produrre:

```text
same invariant
```

o una proprietà formalmente più forte.

Non è sufficiente che la nuova implementazione "funzioni".

---

# ARTICOLO 90 — PRINCIPIO ULTIMO

PRE-RICH non deve essere un sistema nel quale:

> "ci fidiamo del server perché non dovrebbe barare."

Deve essere un sistema nel quale:

> **il server può anche essere compromesso e il protocollo continua a rifiutare ciò che non può essere dimostrato.**

Non deve essere:

> "ci fidiamo del relayer."

Deve essere:

> **il relayer può essere sostituito senza cambiare la verità del gioco.**

Non deve essere:

> "ci fidiamo del publisher Materios."

Deve essere:

> **la prova della canonicalità deve rendere irrilevante chi ha pubblicato l'evidenza.**

Non deve essere:

> "il frontend calcola il risultato correttamente."

Deve essere:

> **il validator deve poter verificare il risultato indipendentemente dal frontend.**

Non deve essere:

> "il backend sa chi ha vinto."

Deve essere:

> **la blockchain deve sapere perché qualcuno ha vinto.**

---

# ARTICOLO 91 — PRINCIPIO FINALE

La proprietà fondamentale di PRE-RICH è:

```text
TRUSTLESS
+
ON-CHAIN
+
SECURE
+
AUTOMATIC
```

Questi quattro principi sono inseparabili.

Una soluzione che è automatica ma richiede fiducia non è conforme.

Una soluzione che è on-chain ma permette a un operatore di scegliere il risultato non è conforme.

Una soluzione che è trustless ma non protegge la solvibilità non è conforme.

Una soluzione che è sicura ma richiede un amministratore per funzionare non realizza l'obiettivo del protocollo.

PRE-RICH deve quindi perseguire una forma di automazione nella quale:

```text
people may operate the infrastructure
but
people do not control the truth.
```

---

# ARTICOLO 92 — CLAUSOLA DI IMMUTABILITÀ DEI PRINCIPI

La governance può evolvere il protocollo.

Non può abolire i suoi principi fondamentali.

In particolare non può trasformare PRE-RICH da:

```text
trustless
```

a:

```text
trusted
```

da:

```text
on-chain
```

a:

```text
custodial/off-chain
```

da:

```text
automatic
```

a:

```text
administrator-controlled
```

o da:

```text
cryptographically verifiable
```

a:

```text
authority-based
```

senza una nuova costituzione che richiederebbe una ridefinizione esplicita dell'identità del protocollo.

---

# ARTICOLO 93 — CLAUSOLA DI CHIUSURA

Ogni futura implementazione, modifica, PoC o integrazione deve essere giudicata attraverso una domanda semplice:

> **"Se tutti i soggetti off-chain fossero malevoli, quali proprietà rimarrebbero comunque vere perché la blockchain può verificarle?"**

La risposta deve essere esplicita.

Se la risposta dipende da:

* un team;
* un founder;
* un admin;
* un backend;
* un relayer;
* un publisher;
* un oracle;
* un adapter;

allora quella proprietà non è ancora pienamente trustless.

Il lavoro del protocollo è trasformare progressivamente tali dipendenze in:

```text
proof
```

e infine in:

```text
on-chain verification
```

---

# PRINCIPIO COSTITUZIONALE FINALE

> **PRE-RICH non deve chiedere agli utenti di fidarsi di chi gestisce il sistema. Deve permettere loro di verificare che il sistema non abbia bisogno della loro fiducia.**
