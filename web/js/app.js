(function () {
  const S = SudokuCore();
  const bit = S.bit;
  const $ = id => document.getElementById(id);
  const P = (r, c) => r * 9 + c;

  // ================= Inhalte =================
  const LEVELS = { 1: 'Einsteiger', 2: 'Leicht', 3: 'Mittel', 4: 'Fortgeschritten', 5: 'Schwer', 6: 'Sehr schwer', 7: 'Experte', 8: 'Meister', 9: 'Virtuose', 10: 'Großmeister' };
  const LV = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const LEVEL_DESC = {
    1: 'Nur Versteckte Einer.',
    2: 'Dazu Nackte Einer.',
    3: 'Ein bis zwei Zeigende Paare oder Block-Linien-Reduktionen.',
    4: 'Mehrere davon oder ein Nacktes Paar.',
    5: 'Versteckte Paare, Nackte und Versteckte Drillinge.',
    6: 'Einmal X-Wing, Y-Wing, Skyscraper, Drachen oder ein Vierer.',
    7: 'Mehrere dieser Techniken.',
    8: 'XYZ-Wing, W-Wing, Schwertfisch, Leeres oder Eindeutiges Rechteck, Qualle.',
    9: 'Simple Coloring oder X-Kette.',
    10: 'XY-Ketten und Widerspruchsketten.'
  };
  const BASE = { 1: 500, 2: 1000, 3: 1500, 4: 2000, 5: 3000, 6: 4000, 7: 5000, 8: 6500, 9: 8000, 10: 10000 };
  const TARGET_MIN = { 1: 5, 2: 7, 3: 10, 4: 13, 5: 17, 6: 22, 7: 28, 8: 35, 9: 45, 10: 60 };

  const INFO = {
    hidden1: ['Die Ziffer hat in einer Einheit nur noch einen Platz.', 'Nimm eine Zeile, Spalte oder einen Block und frag dich für eine fehlende Ziffer: Wo kann sie hier überhaupt noch hin? Bleibt nur ein Feld übrig, gehört sie dorthin. Das Feld selbst darf dabei ruhig noch andere Kandidaten haben.'],
    naked1: ['Das Feld hat nur noch einen Kandidaten.', 'Schau dir ein einzelnes Feld an. Welche Ziffern stehen schon in seiner Zeile, seiner Spalte und seinem Block? Bleibt nur eine Ziffer übrig, ist sie die Lösung.'],
    pointing: ['Im Block auf eine Linie beschränkt.', 'Kann eine Ziffer innerhalb eines Blocks nur in einer einzigen Zeile oder Spalte stehen, dann liegt sie dort sicher. Im Rest dieser Zeile oder Spalte, außerhalb des Blocks, kann sie gestrichen werden.'],
    claiming: ['Auf der Linie auf einen Block beschränkt.', 'Die Umkehrung des Zeigenden Paars. Kann eine Ziffer in einer Zeile oder Spalte nur innerhalb eines Blocks stehen, belegt sie in diesem Block einen Platz auf der Linie. Aus den übrigen Feldern des Blocks fällt sie heraus.'],
    naked2: ['Zwei Felder, dieselben zwei Kandidaten.', 'Zwei Felder derselben Einheit haben genau dieselben zwei Kandidaten, zum Beispiel 3 und 7. Eines wird die 3, das andere die 7. Beide Ziffern sind damit vergeben und fallen aus allen anderen Feldern der Einheit heraus.'],
    hidden2: ['Zwei Ziffern teilen sich zwei Felder.', 'Zwei Ziffern kommen in einer Einheit nur in denselben zwei Feldern vor. Dann gehören diese Felder den beiden Ziffern, und alle anderen Kandidaten darin können weg. Das Paar versteckt sich zwischen weiteren Kandidaten, deshalb fällt es schwerer auf.'],
    naked3: ['Drei Felder teilen sich drei Kandidaten.', 'Wie das Nackte Paar, nur mit drei Feldern. Haben drei Felder einer Einheit zusammen nur drei verschiedene Kandidaten, verteilen sich diese Ziffern auf genau diese Felder. Nicht jedes Feld braucht alle drei: {1,4}, {4,6} und {1,6} zählen auch.'],
    hidden3: ['Drei Ziffern teilen sich drei Felder.', 'Drei Ziffern kommen in einer Einheit nur in denselben drei Feldern vor. Diese Felder sind für die drei Ziffern reserviert, alle anderen Kandidaten darin werden gestrichen.'],
    xwing: ['Ein Rechteck aus vier Plätzen für eine Ziffer.', 'Betrachte nur eine Ziffer. Hat sie in zwei Zeilen jeweils genau zwei mögliche Plätze, und liegen diese in denselben zwei Spalten, bilden sie ein Rechteck. Die Ziffer steht dann entweder oben links und unten rechts oder umgekehrt. In beiden Fällen sind beide Spalten belegt, und überall sonst in diesen Spalten fällt die Ziffer weg. Mit Spalten statt Zeilen funktioniert es genauso.'],
    ywing: ['Drehpunkt und zwei Flügel.', 'Ein Feld mit zwei Kandidaten A und B, der Drehpunkt, sieht zwei weitere Zweier-Felder: eines mit A und C, eines mit B und C. Egal ob der Drehpunkt A oder B wird, einer der beiden Flügel wird zu C. Jedes Feld, das beide Flügel sieht, kann also kein C sein.'],
    naked4: ['Vier Felder teilen sich vier Kandidaten.', 'Wie Paar und Drilling, nur mit vier Feldern. Haben vier Felder einer Einheit zusammen nur vier verschiedene Kandidaten, gehören diese Ziffern genau in diese Felder. Aus allen anderen Feldern der Einheit fallen sie heraus.'],
    hidden4: ['Vier Ziffern teilen sich vier Felder.', 'Vier Ziffern kommen in einer Einheit nur in denselben vier Feldern vor. Diese Felder sind für die vier Ziffern reserviert, alle anderen Kandidaten darin werden gestrichen. Oft ist das Gegenstück leichter zu sehen: ein Nackter Drilling oder Vierer in den übrigen Feldern.'],
    skyscraper: ['Zwei Paare einer Ziffer, an einem Ende verbunden.', 'Eine Ziffer hat in zwei Zeilen jeweils nur zwei Plätze. Zwei dieser Plätze liegen in derselben Spalte, dort kann nur einer die Ziffer sein. Also steht sie an mindestens einem der beiden anderen Enden, den Spitzen der Wolkenkratzer. Felder, die beide Spitzen sehen, verlieren die Ziffer. Mit Spalten statt Zeilen geht es genauso.'],
    kite: ['Zeile und Spalte, verbunden über einen Block.', 'Eine Ziffer hat in einer Zeile nur zwei Plätze und in einer Spalte ebenfalls. Je ein Platz davon liegt im selben Block, und dort kann höchstens einer die Ziffer sein. Also steht sie an einem der beiden äußeren Enden. Das Feld, das beide Enden sieht, verliert die Ziffer. Auf Englisch heißt das Muster 2-String Kite.'],
    xyzwing: ['Y-Wing mit drei Kandidaten im Drehpunkt.', 'Der Drehpunkt hat drei Kandidaten X, Y und Z. Er sieht zwei Zweier-Felder mit X und Z sowie Y und Z. Egal was der Drehpunkt wird, eines der drei Felder ist die Z. Felder, die alle drei sehen, können also keine Z sein.'],
    wwing: ['Zwei gleiche Zweier-Felder, verbunden über ein Paar.', 'Zwei Felder haben dieselben zwei Kandidaten X und Y, sehen sich aber nicht. Gibt es eine Einheit, in der X nur zwei Plätze hat, und sieht der eine Platz das erste, der andere das zweite Feld, können nicht beide Felder X sein. Mindestens eines ist also Y. Felder, die beide sehen, verlieren das Y.'],
    emptyrect: ['Ein Kreuz im Block und ein Paar außerhalb.', 'In einem Block liegen alle Plätze einer Ziffer auf einem Kreuz aus einer Zeile und einer Spalte, der Rest des Blocks ist leer. Kombiniert man das mit einer Einheit außerhalb, in der die Ziffer nur zwei Plätze hat, gibt es ein Feld, das die Ziffer nicht haben kann. Sonst stünde der Block ohne Platz für sie da.'],
    uniquerect: ['Nutzt aus, dass das Rätsel eindeutig ist.', 'Vier Felder bilden ein Rechteck über genau zwei Blöcke. Hätten alle vier nur dieselben zwei Kandidaten, könnte man die Ziffern vertauschen, und es gäbe zwei Lösungen. Ein ordentliches Sudoku hat aber genau eine. Haben drei Ecken nur dieses Paar, muss die vierte etwas anderes sein, und das Paar fällt dort weg.'],
    jellyfish: ['Der Fisch über vier Zeilen.', 'Die nächste Größe nach X-Wing und Schwertfisch. Eine Ziffer kann in vier Zeilen nur in denselben vier Spalten stehen. Dann sind diese vier Spalten belegt, und die Ziffer fällt überall sonst in diesen Spalten weg. Sehr selten, aber gut zu kennen.'],
    coloring: ['Eine Ziffer in zwei Farben einfärben.', 'Nimm eine Ziffer und verbinde ihre Plätze über Einheiten, in denen sie nur zwei Plätze hat. Färbe diese Felder abwechselnd in zwei Farben. Eine Farbe ist am Ende komplett richtig, die andere komplett falsch. Sehen sich zwei Felder derselben Farbe, ist diese Farbe falsch. Sieht ein ungefärbtes Feld beide Farben, kann die Ziffer dort raus. Das Färbe-Werkzeug im Notizmodus ist genau dafür gedacht.'],
    xchain: ['Eine Kette mit nur einer Ziffer.', 'Verbinde Plätze einer Ziffer abwechselnd stark und schwach. Stark heißt: In einer Einheit gibt es nur diese zwei Plätze, einer davon ist die Ziffer. Schwach heißt: Die Felder sehen sich, höchstens eines ist die Ziffer. Beginnt und endet die Kette stark, ist eines der beiden Enden die Ziffer. Felder, die beide Enden sehen, verlieren sie.'],
    xychain: ['Eine Kette aus Zweier-Feldern.', 'Reihe Zweier-Felder so aneinander, dass benachbarte Felder sich sehen und eine Ziffer teilen. Ist das erste Feld nicht Z, wird es zur anderen Ziffer, das zwingt das nächste Feld, und so weiter. Wird das letzte Feld dadurch zur Z, ist eines der beiden Enden sicher die Z. Der Y-Wing ist die kürzeste XY-Kette.'],
    forcing: ['Annahme treffen und auf Widerspruch prüfen.', 'Das letzte Mittel. Setze probeweise eine Ziffer und rechne nur mit Einern weiter. Endet das in einem Widerspruch, etwa einem Feld ohne Kandidaten oder einer Ziffer ohne Platz in einer Einheit, war die Annahme falsch und die Ziffer kann gestrichen werden. Gute Rätsel kommen meist ohne aus, Großmeister-Rätsel nicht.'],
    swordfish: ['Ein X-Wing über drei Zeilen.', 'Der große Bruder des X-Wings. Eine Ziffer kann in drei Zeilen jeweils nur in denselben drei Spalten stehen, mit zwei oder drei Plätzen pro Zeile. Dann sind diese drei Spalten für die Ziffer belegt, und sie fällt überall sonst in diesen Spalten weg.']
  };

  // Beispielbilder: g = Vorgaben, n = Kandidaten, units = hervorgehobene Einheiten, key = Schlüsselfelder, elim = wegfallende Kandidaten
  const g = pairs => Object.fromEntries(pairs.map(([r, c, d]) => [P(r, c), d]));
  const n = pairs => Object.fromEntries(pairs.map(([r, c, ds]) => [P(r, c), ds]));
  const EX = {
    hidden1: { g: g([[1, 0, 4], [2, 2, 9], [1, 5, 7], [2, 7, 7], [5, 1, 7], [7, 2, 7], [0, 4, 2], [4, 6, 5]]), units: [18], same: [P(1, 5), P(2, 7), P(5, 1), P(7, 2)], ghost: { cell: P(0, 0), d: 7 },
      cap: 'Die 7en in Zeile 2 und 3 sowie in Spalte 2 und 3 sperren fast den ganzen Block 1. Für die 7 bleibt nur das Feld oben links.' },
    naked1: { g: g([[4, 0, 1], [4, 2, 2], [4, 7, 3], [0, 4, 4], [2, 4, 5], [7, 4, 6], [3, 3, 8], [5, 5, 9]]), units: [4, 13, 22], ghost: { cell: P(4, 4), d: 7 }, key: [P(4, 4)],
      cap: 'Zeile, Spalte und Block des mittleren Feldes enthalten schon 1 bis 6, 8 und 9. Übrig bleibt nur die 7.' },
    pointing: { g: g([[1, 0, 2], [1, 1, 6], [1, 2, 8], [2, 0, 1], [2, 1, 9], [2, 2, 3], [0, 2, 5], [0, 3, 7], [0, 6, 9]]), n: n([[0, 0, [4]], [0, 1, [4]], [0, 4, [4]], [0, 7, [4]]]),
      units: [18, 0], key: [P(0, 0), P(0, 1)], elim: { [P(0, 4)]: [4], [P(0, 7)]: [4] }, digits: [4],
      cap: 'In Block 1 kann die 4 nur in Zeile 1 stehen. Also fällt sie im Rest von Zeile 1 weg.' },
    claiming: { g: g([[0, 0, 1], [0, 3, 6], [0, 4, 2], [0, 5, 8], [0, 6, 5], [0, 7, 9], [0, 8, 7], [1, 1, 5], [1, 2, 3], [2, 0, 8], [2, 2, 6]]), n: n([[0, 1, [4]], [0, 2, [4]], [1, 0, [4]], [2, 1, [4]]]),
      units: [0, 18], key: [P(0, 1), P(0, 2)], elim: { [P(1, 0)]: [4], [P(2, 1)]: [4] }, digits: [4],
      cap: 'In Zeile 1 kann die 4 nur in Block 1 stehen. Also fällt sie in den übrigen Feldern des Blocks weg.' },
    naked2: { g: g([[4, 0, 1], [4, 2, 2], [4, 5, 4], [4, 7, 8]]), n: n([[4, 1, [3, 7]], [4, 6, [3, 7]], [4, 3, [3, 5, 9]], [4, 4, [6, 7, 9]], [4, 8, [3, 6, 7]]]),
      units: [4], key: [P(4, 1), P(4, 6)], elim: { [P(4, 3)]: [3], [P(4, 4)]: [7], [P(4, 8)]: [3, 7] }, digits: [3, 7],
      cap: 'Zwei Felder in Zeile 5 haben nur 3 und 7. Diese beiden Ziffern fallen aus allen anderen Feldern der Zeile.' },
    hidden2: { g: g([[6, 7, 3], [7, 6, 6], [7, 8, 7], [8, 7, 5]]), n: n([[6, 8, [1, 2, 8, 9]], [7, 7, [1, 4, 8, 9]], [6, 6, [2, 9]], [8, 6, [4, 9]], [8, 8, [2, 4]]]),
      units: [26], key: [P(6, 8), P(7, 7)], elim: { [P(6, 8)]: [2, 9], [P(7, 7)]: [4, 9] }, digits: [1, 8],
      cap: 'Die 1 und die 8 kommen in Block 9 nur in zwei Feldern vor. Alle anderen Kandidaten in diesen Feldern fallen weg.' },
    naked3: { g: g([[1, 1, 2], [3, 1, 5], [6, 1, 7], [8, 1, 9]]), n: n([[0, 1, [1, 4]], [4, 1, [4, 6]], [7, 1, [1, 6]], [2, 1, [1, 3, 6]], [5, 1, [4, 8]]]),
      units: [10], key: [P(0, 1), P(4, 1), P(7, 1)], elim: { [P(2, 1)]: [1, 6], [P(5, 1)]: [4] }, digits: [1, 4, 6],
      cap: 'Drei Felder in Spalte 2 teilen sich 1, 4 und 6. Diese Ziffern fallen aus den restlichen Feldern der Spalte.' },
    hidden3: { g: g([[6, 8, 1], [7, 8, 4], [8, 6, 7], [8, 7, 5]]), n: n([[6, 7, [2, 6, 8]], [7, 6, [3, 6, 9]], [7, 7, [2, 8, 9]], [6, 6, [2, 3]], [8, 8, [2, 3]]]),
      units: [26], key: [P(6, 7), P(7, 6), P(7, 7)], elim: { [P(6, 7)]: [2], [P(7, 6)]: [3], [P(7, 7)]: [2] }, digits: [6, 8, 9],
      cap: '6, 8 und 9 kommen in Block 9 nur in drei Feldern vor. Die übrigen Kandidaten dort fallen weg.' },
    xwing: { g: g([[2, 3, 7], [2, 5, 1], [6, 0, 3], [6, 4, 8], [4, 4, 2], [0, 0, 6]]), n: n([[2, 1, [4]], [2, 7, [4]], [6, 1, [4]], [6, 7, [4]], [4, 1, [4]], [8, 1, [4]], [0, 7, [4]]]),
      units: [2, 6, 10, 16], key: [P(2, 1), P(2, 7), P(6, 1), P(6, 7)], elim: { [P(4, 1)]: [4], [P(8, 1)]: [4], [P(0, 7)]: [4] }, digits: [4],
      cap: 'In Zeile 3 und 7 hat die 4 nur Plätze in Spalte 2 und 8. Damit fällt sie überall sonst in diesen Spalten weg.' },
    ywing: { g: g([[1, 4, 5], [3, 1, 8], [5, 4, 1]]), n: n([[1, 1, [3, 6]], [1, 7, [2, 3]], [5, 1, [2, 6]], [5, 7, [2, 9]]]),
      key: [P(1, 1), P(1, 7), P(5, 1)], elim: { [P(5, 7)]: [2] }, digits: [2, 3, 6],
      cap: 'Drehpunkt {3,6} oben links. Wird er 3, ist der rechte Flügel 2. Wird er 6, ist der untere Flügel 2. Das Feld unten rechts sieht beide Flügel und kann keine 2 sein.' },
    swordfish: { g: g([[0, 0, 3], [4, 1, 9], [8, 4, 6]]), n: n([[0, 2, [5]], [0, 5, [5]], [4, 5, [5]], [4, 7, [5]], [8, 2, [5]], [8, 7, [5]], [3, 2, [5]], [6, 2, [5]], [2, 5, [5]], [5, 7, [5]]]),
      units: [0, 4, 8, 11, 14, 16], key: [P(0, 2), P(0, 5), P(4, 5), P(4, 7), P(8, 2), P(8, 7)], elim: { [P(3, 2)]: [5], [P(6, 2)]: [5], [P(2, 5)]: [5], [P(5, 7)]: [5] }, digits: [5],
      cap: 'In den Zeilen 1, 5 und 9 hat die 5 nur Plätze in den Spalten 3, 6 und 8. In diesen Spalten fällt sie überall sonst weg.' }
  };

  Object.assign(EX, {
    naked4: { g: g([[4, 0, 1], [4, 4, 5], [4, 8, 9]]), n: n([[4, 1, [2, 3]], [4, 3, [3, 4]], [4, 5, [2, 4, 6]], [4, 7, [2, 6]], [4, 2, [2, 7, 8]], [4, 6, [3, 6, 7, 8]]]),
      units: [4], key: [P(4, 1), P(4, 3), P(4, 5), P(4, 7)], elim: { [P(4, 2)]: [2], [P(4, 6)]: [3, 6] }, digits: [2, 3, 4, 6],
      cap: 'Vier Felder in Zeile 5 teilen sich 2, 3, 4 und 6. Diese Ziffern fallen aus den übrigen Feldern der Zeile.' },
    hidden4: { g: g([[0, 1, 3], [2, 0, 8]]), n: n([[0, 0, [1, 2, 4, 6]], [1, 1, [2, 5, 7]], [1, 2, [1, 5, 9]], [2, 2, [2, 6, 9]], [0, 2, [4, 6, 7]], [1, 0, [4, 7]], [2, 1, [4, 6, 7]]]),
      units: [18], key: [P(0, 0), P(1, 1), P(1, 2), P(2, 2)], elim: { [P(0, 0)]: [4, 6], [P(1, 1)]: [7], [P(2, 2)]: [6] }, digits: [1, 2, 5, 9],
      cap: '1, 2, 5 und 9 kommen in Block 1 nur in vier Feldern vor. Alle anderen Kandidaten darin fallen weg.' },
    skyscraper: { g: g([[1, 0, 4], [1, 4, 1], [6, 0, 7], [6, 4, 2]]), n: n([[1, 2, [6]], [1, 6, [6]], [6, 2, [6]], [6, 7, [6]], [0, 7, [6]], [8, 6, [6]], [3, 2, [6]]]),
      units: [1, 6], key: [P(1, 2), P(1, 6), P(6, 2), P(6, 7)], elim: { [P(0, 7)]: [6], [P(8, 6)]: [6] }, digits: [6],
      cap: 'Die 6 hat in Zeile 2 und 7 je nur zwei Plätze, zwei davon übereinander in Spalte 3. Eine der beiden Spitzen rechts ist also die 6. Die rot markierten Felder sehen beide.' },
    kite: { g: g([[0, 3, 5], [4, 0, 9]]), n: n([[0, 1, [3]], [0, 6, [3]], [2, 0, [3]], [7, 0, [3]], [7, 6, [3]]]),
      units: [0, 9], key: [P(0, 1), P(0, 6), P(2, 0), P(7, 0)], elim: { [P(7, 6)]: [3] }, digits: [3],
      cap: 'Zeile 1 und Spalte 1 haben für die 3 je zwei Plätze, die sich in Block 1 treffen. Eines der äußeren Enden ist die 3, und das Feld unten rechts sieht beide.' },
    xyzwing: { g: g([[0, 4, 3], [2, 5, 9]]), n: n([[1, 4, [1, 2, 7]], [1, 7, [1, 7]], [2, 3, [2, 7]], [1, 5, [5, 7]], [1, 3, [5, 6]]]),
      key: [P(1, 4), P(1, 7), P(2, 3)], elim: { [P(1, 5)]: [7] }, digits: [1, 2, 7],
      cap: 'Drehpunkt {1,2,7} mit den Flügeln {1,7} und {2,7}. Eines der drei Felder ist die 7. Das Feld rechts vom Drehpunkt sieht alle drei.' },
    wwing: { g: g([[3, 3, 7], [3, 4, 1]]), n: n([[0, 0, [2, 5]], [5, 6, [2, 5]], [3, 0, [5]], [3, 6, [5]], [0, 6, [2, 8]], [5, 0, [2, 9]]]),
      units: [3], key: [P(0, 0), P(5, 6), P(3, 0), P(3, 6)], elim: { [P(0, 6)]: [2], [P(5, 0)]: [2] }, digits: [2, 5],
      cap: 'Beide Zweier-Felder haben {2,5}. In Zeile 4 hat die 5 nur zwei Plätze, die je eines davon sehen. Also ist eines der Zweier-Felder die 2.' },
    emptyrect: { g: g([[0, 0, 9], [0, 2, 4], [1, 1, 6], [1, 2, 2], [2, 1, 8], [2, 2, 7]]), n: n([[0, 1, [1]], [1, 0, [1]], [2, 0, [1]], [0, 6, [1]], [5, 6, [1]], [5, 0, [1]]]),
      units: [18, 15], key: [P(0, 1), P(1, 0), P(2, 0), P(0, 6), P(5, 6)], elim: { [P(5, 0)]: [1] }, digits: [1],
      cap: 'In Block 1 liegt die 1 nur auf dem Kreuz aus Zeile 1 und Spalte 1. Spalte 7 hat nur zwei Plätze. Wäre unten links eine 1, hätte Block 1 keinen Platz mehr.' },
    uniquerect: { g: g([[1, 0, 5], [2, 6, 1]]), n: n([[1, 1, [3, 8]], [1, 4, [3, 8]], [2, 1, [3, 8]], [2, 4, [3, 6, 8]]]),
      key: [P(1, 1), P(1, 4), P(2, 1), P(2, 4)], elim: { [P(2, 4)]: [3, 8] }, digits: [3, 8],
      cap: 'Drei Ecken haben nur {3,8}. Die vierte darf nicht auch nur 3 oder 8 werden, sonst gäbe es zwei Lösungen. Übrig bleibt die 6.' },
    jellyfish: { g: g([[4, 4, 2]]), n: n([[0, 1, [9]], [0, 6, [9]], [2, 3, [9]], [2, 8, [9]], [5, 1, [9]], [5, 3, [9]], [7, 6, [9]], [7, 8, [9]], [4, 1, [9]], [8, 3, [9]], [3, 6, [9]], [1, 8, [9]]]),
      units: [0, 2, 5, 7], key: [P(0, 1), P(0, 6), P(2, 3), P(2, 8), P(5, 1), P(5, 3), P(7, 6), P(7, 8)], elim: { [P(4, 1)]: [9], [P(8, 3)]: [9], [P(3, 6)]: [9], [P(1, 8)]: [9] }, digits: [9],
      cap: 'In den Zeilen 1, 3, 6 und 8 hat die 9 nur Plätze in den Spalten 2, 4, 7 und 9. In diesen Spalten fällt sie überall sonst weg.' },
    coloring: { g: g([[1, 3, 2], [6, 4, 5]]), n: n([[1, 1, [4]], [1, 6, [4]], [6, 6, [4]], [6, 2, [4]], [7, 1, [4]], [4, 1, [4]]]),
      key: [P(1, 1), P(1, 6), P(6, 6), P(6, 2)], elim: { [P(7, 1)]: [4] }, digits: [4],
      colors: { [P(1, 1) * 10 + 4]: '#E5484D', [P(6, 6) * 10 + 4]: '#E5484D', [P(1, 6) * 10 + 4]: '#2F80ED', [P(6, 2) * 10 + 4]: '#2F80ED' },
      cap: 'Die vier Felder sind über Paare der 4 verbunden und abwechselnd gefärbt. Das Feld unten links sieht ein rotes und ein blaues Feld, also kann dort keine 4 stehen.' },
    xchain: { g: g([[0, 3, 6], [5, 5, 3]]), n: n([[1, 0, [8]], [1, 5, [8]], [4, 5, [8]], [4, 7, [8]], [7, 7, [8]], [7, 1, [8]], [6, 5, [8]], [0, 7, [8]], [2, 1, [8]], [8, 0, [8]]]),
      key: [P(1, 0), P(1, 5), P(4, 5), P(4, 7), P(7, 7), P(7, 1)], elim: { [P(2, 1)]: [8], [P(8, 0)]: [8] }, digits: [8],
      cap: 'Kette für die 8: Zeile 2 stark, Spalte 6 schwach, Zeile 5 stark, Spalte 8 schwach, Zeile 8 stark. Eines der beiden Enden ist die 8.' },
    xychain: { g: g([[1, 2, 6], [2, 5, 9]]), n: n([[0, 0, [1, 2]], [0, 4, [2, 3]], [3, 4, [3, 4]], [3, 8, [1, 4]], [0, 8, [1, 5]], [3, 0, [1, 7]]]),
      key: [P(0, 0), P(0, 4), P(3, 4), P(3, 8)], elim: { [P(0, 8)]: [1], [P(3, 0)]: [1] }, all: true,
      cap: 'Ist das Feld oben links keine 1, wird es 2, dann folgen 3, 4 und am Ende eine 1. Eines der Enden ist also die 1.' },
    forcing: { g: g([[0, 2, 1], [1, 1, 4], [2, 4, 6], [4, 4, 9], [3, 7, 2]]), units: [],
      ghosts: [{ cell: P(0, 0), d: 5, cls: 'assume' }, { cell: P(0, 6), d: 7 }, { cell: P(4, 6), d: 5 }, { cell: P(4, 2), d: 7 }], err: [P(2, 2)],
      key: [P(0, 0)], cap: 'Angenommen, oben links stünde die 5 (blau). Daraus folgen nacheinander die grünen Ziffern, bis ein Feld (rot) gar keinen Kandidaten mehr hat. Also ist die 5 dort falsch.' }
  });

  const PRESETS = [
    { id: 'schiefer', name: 'Schiefer', bg: '#F4F5F7', accent: '#3B5BDB' },
    { id: 'salbei', name: 'Salbei', bg: '#F2F4F1', accent: '#3E7A5A' },
    { id: 'bernstein', name: 'Bernstein', bg: '#F6F4F0', accent: '#B8620E' },
    { id: 'pflaume', name: 'Pflaume', bg: '#F5F3F7', accent: '#7A3E9D' },
    { id: 'nacht', name: 'Nacht', bg: '#14161B', accent: '#7AA2FF' },
    { id: 'tinte', name: 'Tinte', bg: '#0F1A1C', accent: '#3CC6B5' }
  ];

  // ================= Speicher =================
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  const freshStats = () => ({ v: 2, total: 0, levels: {}, lessons: {} });
  let stats = Object.assign(freshStats(), store.get('ss-stats2') || {});
  const saveStats = () => { store.set('ss-stats2', stats); syncPush(); };
  let settings = store.get('ss-settings') || null;
  const BASE_COLORS = ['#E5484D', '#F08C00', '#E2B714', '#30A46C', '#2F80ED', '#8E4EC6'];
  let customColors = store.get('ss-colors') || [];
  const saveCustom = () => { store.set('ss-colors', customColors); touchSettings(); };
  const allColors = () => BASE_COLORS.concat(customColors);
  const chipInk = c => contrast('#FFFFFF', c) >= contrast('#111318', c) ? '#FFFFFF' : '#111318';
  const OLD_MAP = { 1: 2, 2: 4, 3: 5, 4: 7 };
  if (stats.v !== 2) {
    const lv = {};
    for (const k in stats.levels || {}) lv[OLD_MAP[k] || k] = stats.levels[k];
    stats.levels = lv; stats.v = 2; saveStats();
  }
  let G = store.get('ss-game');
  if (G && !G.v) { if (G.mode === 'play' && OLD_MAP[G.level]) G.level = OLD_MAP[G.level]; G.v = 2; }
  if (G && (!Array.isArray(G.values) || G.values.length !== 81)) G = null;
  const save = () => (G ? store.set('ss-game', G) : store.del('ss-game'));

  // ================= Synchronisation =================
  // Jedes Gerät führt eigene Zähler; angezeigt wird die Summe über alle Geräte (Rekorde: bester Wert).
  // Einstellungen und laufendes Spiel: der zuletzt geänderte Stand gewinnt.
  const SYNC = window.SudokuSync || null;
  const PLATFORM = window.SudokuPlatform || null;
  const meta = Object.assign({ epoch: 0, settingsAt: 0, gameAt: 0, uid: null }, store.get('ss-meta') || {});
  const saveMeta = () => store.set('ss-meta', meta);
  let deviceId = store.get('ss-device');
  if (!deviceId) { deviceId = Math.random().toString(36).slice(2, 10) + Date.now().toString(36); store.set('ss-device', deviceId); }
  let others = store.get('ss-others') || [];
  function syncPush() { if (SYNC) SYNC.push(); }
  function touchSettings() { meta.settingsAt = Date.now(); saveMeta(); syncPush(); }
  function touchGame() { meta.gameAt = Date.now(); saveMeta(); syncPush(); }
  function agg() {
    const out = { total: 0, levels: {}, lessons: {} };
    for (const s of [stats, ...others]) {
      out.total += s.total || 0;
      for (const l in s.levels || {}) {
        const a = s.levels[l], o = (out.levels[l] = out.levels[l] || {});
        o.solved = (o.solved || 0) + (a.solved || 0);
        o.time = (o.time || 0) + (a.time || 0);
        o.points = (o.points || 0) + (a.points || 0);
        if (a.bestTime && (!o.bestTime || a.bestTime < o.bestTime)) o.bestTime = a.bestTime;
        if (a.bestScore && (!o.bestScore || a.bestScore > o.bestScore)) o.bestScore = a.bestScore;
      }
      for (const t in s.lessons || {}) out.lessons[t] = (out.lessons[t] || 0) + s.lessons[t];
    }
    return out;
  }
  function localForSync() {
    return {
      deviceId, epoch: meta.epoch, stats,
      settings: { settings, custom: customColors }, settingsAt: meta.settingsAt,
      game: G ? Object.assign({}, G, { hist: (G.hist || []).slice(-30) }) : null, gameAt: meta.gameAt
    };
  }
  function applyRemote(r) {
    if (!r) return;
    const uid = SYNC && SYNC.state.user ? SYNC.state.user.uid : null;
    let redraw = false;
    if ((r.epoch || 0) > meta.epoch) {
      // Fortschritt wurde auf einem anderen Gerät zurückgesetzt. Beim ersten Abgleich mit diesem Konto bleibt der Offline-Stand erhalten.
      if (meta.uid === uid) { stats = freshStats(); store.set('ss-stats2', stats); }
      meta.epoch = r.epoch; redraw = true;
    }
    meta.uid = uid;
    others = Object.entries(r.devices || {})
      .filter(([id, d]) => id !== deviceId && (d.epoch || 0) === (r.epoch || 0))
      .map(([, d]) => { try { return JSON.parse(d.json); } catch (e) { return null; } }).filter(Boolean);
    store.set('ss-others', others);
    if (r.settings && (r.settings.at || 0) > meta.settingsAt) {
      try {
        const v = JSON.parse(r.settings.json) || {};
        settings = v.settings || null; customColors = v.custom || [];
        settings ? store.set('ss-settings', settings) : store.del('ss-settings');
        store.set('ss-colors', customColors);
        meta.settingsAt = r.settings.at; applyTheme(); redraw = true;
      } catch (e) { /* defekte Daten ignorieren */ }
    }
    let gameChanged = false;
    if (r.game && (r.game.at || 0) > meta.gameAt) {
      try {
        const g = JSON.parse(r.game.json);
        G = g && Array.isArray(g.values) && g.values.length === 81 ? Object.assign({ hist: [] }, g) : null;
        save(); meta.gameAt = r.game.at; gameChanged = true;
      } catch (e) { /* defekte Daten ignorieren */ }
    }
    saveMeta();
    if (gameChanged && ui.screen === 'game') {
      ui.hint = null; ui.sel = -1;
      if (G) { renderGameShell(); toast('Spielstand von einem anderen Gerät übernommen.'); } else go('menu');
    } else if (!ui.busy && !ui.picker && ['menu', 'level', 'training', 'detail', 'stats', 'options'].includes(ui.screen)) render();
  }

  const ui = { genToken: 0, screen: 'menu', sel: -1, notesMode: false, colorMode: false, color: '#E5484D', addingColor: false, hint: null, busy: false, flash: -1, tech: null, showInfo: false, modal: null };

  // ================= Farben =================
  const hex2rgb = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
  const rgb2hex = a => '#' + a.map(x => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A.map((x, i) => x + (B[i] - x) * t)); };
  const lum = h => { const [r, gg, b] = hex2rgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * gg + 0.0722 * b; };
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

  function hostDark() {
    const t = document.documentElement.getAttribute('data-theme');
    if (t === 'dark') return true;
    if (t === 'light') return false;
    try { return matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { return false; }
  }
  function currentColors() {
    if (settings && settings.bg && settings.accent) return settings;
    const p = hostDark() ? PRESETS[4] : PRESETS[0];
    return { bg: p.bg, accent: p.accent, preset: null };
  }
  function applyTheme() {
    const { bg, accent } = currentColors();
    const dark = lum(bg) < 0.25;
    const ink = dark ? mix('#EEF0F4', accent, 0.04) : mix('#1B1E26', accent, 0.06);
    const surface = dark ? mix(bg, '#FFFFFF', 0.045) : mix(bg, '#FFFFFF', 0.65);
    let acc = accent;
    for (let k = 0; k < 10 && contrast(acc, surface) < 3.2; k++) acc = mix(acc, ink, 0.15);
    const accInk = contrast('#FFFFFF', acc) >= contrast('#111318', acc) ? '#FFFFFF' : '#111318';
    const err = dark ? '#FF7A7A' : '#C53434', ok = dark ? '#5BCB93' : '#23845A';
    const v = {
      '--bg': bg, '--surface': surface, '--ink': ink, '--muted': mix(ink, bg, 0.45),
      '--hair': mix(surface, ink, dark ? 0.13 : 0.12), '--line': mix(surface, ink, dark ? 0.6 : 0.72),
      '--accent': acc, '--accent-ink': accInk,
      '--sel': mix(surface, acc, dark ? 0.44 : 0.32), '--peer': mix(surface, ink, dark ? 0.06 : 0.045), '--rowcol': mix(surface, acc, dark ? 0.1 : 0.065),
      '--same': mix(surface, acc, dark ? 0.24 : 0.17), '--unit': mix(surface, acc, dark ? 0.14 : 0.09), '--key': mix(surface, acc, dark ? 0.34 : 0.24),
      '--err': err, '--err-soft': mix(surface, err, 0.16), '--ok': ok, '--ok-soft': mix(surface, ok, 0.15)
    };
    const st = document.documentElement.style;
    for (const k in v) st.setProperty(k, v[k]);
    st.setProperty('color-scheme', dark ? 'dark' : 'light');
  }
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!settings) applyTheme(); }); } catch (e) {}

  // ================= Hilfen =================
  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const pts = x => Math.round(x).toLocaleString('de-DE');
  const dots = l => `<span class="dots" aria-label="Stufe ${l} von 10">${LV.map(k => `<i class="${k <= l ? 'on' : ''}"></i>`).join('')}</span>`;
  const ICON = {
    back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    undo: '<svg viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
    erase: '<svg viewBox="0 0 24 24"><path d="m7 20-4-4 11-11 7 7-8 8z"/><path d="M7 20h13"/></svg>',
    pencil: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg>',
    fill: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M8 8h.01M12 8h.01M16 8h.01M8 12h.01M16 12h.01M12 16h.01" stroke-width="2.6"/></svg>',
    bulb: '<svg viewBox="0 0 24 24"><path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>',
    paint: '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-.9-.7-1.3-.7-2.1 0-.8.7-1.5 1.5-1.5H17a4 4 0 0 0 4-4c0-4.9-4-8.8-9-8.8z"/><circle cx="7.5" cy="11" r="1.1"/><circle cx="10.5" cy="7" r="1.1"/><circle cx="15.5" cy="7.5" r="1.1"/></svg>',
    chev: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg>'
  };

  function scoreFor(game) {
    const base = BASE[game.level], T = TARGET_MIN[game.level] * 60;
    const bonus = 0.5 * base * Math.max(0, Math.min(1, (2 * T - game.elapsed) / (2 * T)));
    const errPen = 0.1 * base * game.mistakes, hintPen = 0.05 * base * game.hints, autoPen = game.autofilled ? 0.15 * base : 0;
    const raw = base + bonus - errPen - hintPen - autoPen, min = 0.1 * base;
    return { base, bonus: Math.round(bonus), errPen: Math.round(errPen), hintPen: Math.round(hintPen), autoPen: Math.round(autoPen), total: Math.round(Math.max(min, raw)), floored: raw < min };
  }
  const counts = () => G.mode === 'play';

  // ================= Navigation =================
  function go(screen, opts = {}) {
    ui.screen = screen;
    if (opts.tech) ui.tech = opts.tech;
    ui.hint = null; ui.showInfo = false;
    if (screen !== 'game') ui.sel = -1;
    if (screen === 'account') { ui.accMsg = null; ui.delOpen = false; }
    render();
    window.scrollTo(0, 0);
  }
  function backTarget() {
    return { level: 'menu', game: G && G.mode === 'lesson' ? 'detail' : 'menu', training: 'menu', detail: 'training', stats: 'menu', options: 'menu', account: 'menu' }[ui.screen] || 'menu';
  }
  function header(title, right = '') {
    return `<header class="hd"><button class="iconbtn" data-nav="${backTarget()}" aria-label="Zurück">${ICON.back}</button><h1>${title}</h1><div class="right">${right}</div></header>`;
  }

  // ================= Spiele starten =================
  const blankGame = extra => Object.assign({ notes: new Array(81).fill(0), hist: [], mistakes: 0, hints: 0, elapsed: 0, won: false }, extra);
  function showBusy(text, cancellable) {
    ui.busy = true;
    $('modal').hidden = false;
    $('modal').innerHTML = `<div class="card" style="align-items:center;text-align:center"><div class="spinner"></div><div>${text}</div><div class="sub" id="busy-n"></div>${cancellable ? '<button class="btn" data-act="cancelgen">Abbrechen</button>' : ''}</div>`;
  }
  function hideBusy() { ui.busy = false; renderModal(); }

  // Rätsel werden in kleinen Häppchen erzeugt, damit die App bedienbar bleibt
  function runGen(gen, text, maxMs, onDone, onFail) {
    const token = ++ui.genToken, t0 = Date.now();
    let last = null;
    showBusy(text, true);
    const slice = () => {
      if (token !== ui.genToken) return;
      const s0 = Date.now();
      while (Date.now() - s0 < 60) {
        const st = gen.next();
        if (st.done) { hideBusy(); return onDone(st.value); }
        last = st.value;
      }
      const el = $('busy-n');
      if (el && last) el.textContent = `${last.attempts} Rätsel geprüft`;
      if (Date.now() - t0 > maxMs) {
        hideBusy();
        if (last && last.best) return onDone(Object.assign(last.best, { fallback: true }));
        return onFail();
      }
      setTimeout(slice, 0);
    };
    setTimeout(slice, 40);
  }

  // Vorrat: im Hintergrund schon das nächste Rätsel derselben Stufe vorbereiten
  let bg = null;
  function getSpare(L) { const sp = store.get('ss-spare') || {}; const r = sp[L]; if (r) { delete sp[L]; store.set('ss-spare', sp); } return r || null; }
  function ensureSpare(L) {
    const sp = store.get('ss-spare') || {};
    if (sp[L] || (bg && bg.L === L)) return;
    bg = { L, gen: S.levelGen(L), t0: Date.now() };
    setTimeout(tickBg, 800);
  }
  function tickBg() {
    if (!bg) return;
    if (ui.busy) { setTimeout(tickBg, 500); return; }
    const s0 = Date.now();
    while (Date.now() - s0 < 12) {
      const st = bg.gen.next();
      if (st.done) { const sp = store.get('ss-spare') || {}; sp[bg.L] = st.value; store.set('ss-spare', sp); bg = null; return; }
    }
    if (Date.now() - bg.t0 > 180000) { bg = null; return; }
    setTimeout(tickBg, 150);
  }

  function beginGame(r, wanted) {
    G = blankGame({ v: 2, mode: 'play', level: r.level, puzzle: r.puzzle, solution: r.solution, values: r.puzzle.slice(), used: r.used });
    ui.notesMode = false; ui.colorMode = false; ui.sel = -1;
    save(); touchGame(); go('game');
    if (r.fallback) toast(`Kein Rätsel der Stufe ${LEVELS[wanted]} gefunden, hier eines der Stufe ${LEVELS[r.level]}.`);
    ensureSpare(wanted);
  }
  function startGame(level) {
    const spare = getSpare(level);
    if (spare) return beginGame(spare, level);
    if (bg && bg.L === level) bg = null;
    runGen(S.levelGen(level), `Rätsel der Stufe ${LEVELS[level]} wird erstellt …${level >= 8 ? '<br><span class="sub">Bei hohen Stufen kann das ein paar Sekunden dauern.</span>' : ''}`, 45000,
      r => beginGame(r, level), () => toast('Kein passendes Rätsel gefunden. Bitte versuch es noch einmal.'));
  }
  function requestNewGame(level) {
    if (G && !G.won && G.mode === 'play' && G.hist.length) {
      ui.modal = { title: 'Laufendes Spiel verwerfen?', text: `Du hast ein Spiel der Stufe ${LEVELS[G.level]} angefangen. Wenn du ein neues startest, geht dieser Fortschritt verloren.`, ok: 'Neues Spiel starten', danger: true, run: () => startGame(level) };
      renderModal();
    } else startGame(level);
  }
  function startLesson(tech) {
    const run = () => runGen(S.lessonGen(tech), `Suche eine Aufgabe zu „${S.TECH[tech].name}“ …`, 40000, r => {
      const snap = r.snapshot, single = tech === 'hidden1' || tech === 'naked1';
      G = blankGame({ v: 2, mode: 'lesson', tech, level: r.level, puzzle: r.puzzle, solution: r.solution, values: snap.g.slice(),
        notes: single ? new Array(81).fill(0) : snap.c.slice(), used: r.used, lesson: { step: snap.step, done: false } });
      ui.notesMode = !snap.step.place; ui.colorMode = false; ui.sel = -1;
      save(); touchGame(); go('game', { tech });
    }, () => toast('Keine Aufgabe gefunden. Bitte versuch es noch einmal.'));
    if (G && !G.won && G.mode === 'play' && G.hist.length) {
      ui.modal = { title: 'Laufendes Spiel verwerfen?', text: 'Eine Trainingsaufgabe ersetzt dein angefangenes Spiel.', ok: 'Aufgabe starten', danger: true, run };
      renderModal();
    } else run();
  }

  // ================= Eingaben =================
  function pushHist() { G.hist.push({ v: G.values.slice(), n: G.notes.slice(), c: Object.assign({}, G.colors || {}) }); if (G.hist.length > 200) G.hist.shift(); }
  function input(d) {
    const i = ui.sel;
    if (!G || G.won || i < 0 || G.puzzle[i]) return;
    if (ui.colorMode) {
      if (G.values[i]) return;
      if (!(G.notes[i] & bit(d))) { toast(`Die ${d} ist in diesem Feld kein Kandidat.`); return; }
      pushHist();
      G.colors = G.colors || {};
      const key = i * 10 + d;
      if (G.colors[key] === ui.color) delete G.colors[key]; else G.colors[key] = ui.color;
    } else if (ui.notesMode) {
      if (G.values[i]) return;
      pushHist(); G.notes[i] ^= bit(d);
    } else {
      pushHist();
      if (G.values[i] === d) G.values[i] = 0;
      else {
        G.values[i] = d;
        if (d !== G.solution[i]) { G.mistakes++; ui.flash = i; }
        else for (const p of S.PEERS[i]) G.notes[p] &= ~bit(d);
      }
    }
    changed();
  }
  function erase() {
    const i = ui.sel;
    if (!G || G.won || i < 0 || G.puzzle[i] || (!G.values[i] && !G.notes[i])) return;
    pushHist();
    if (G.values[i]) G.values[i] = 0; else G.notes[i] = 0;
    changed();
  }
  function undo() { if (!G || G.won || !G.hist.length) return; const h = G.hist.pop(); G.values = h.v; G.notes = h.n; G.colors = h.c || {}; changed(); }
  function fillCands() {
    if (!G || G.won) return;
    pushHist();
    const c = S.initCands(G.values);
    for (let i = 0; i < 81; i++) if (!G.values[i]) G.notes[i] = c[i];
    changed();
  }
  function cleanColors() {
    if (!G.colors) return;
    for (const k in G.colors) { const i = Math.floor(k / 10), d = k % 10; if (G.values[i] || !(G.notes[i] & bit(d))) delete G.colors[k]; }
  }
  function clearColors() {
    if (!G || !G.colors || !Object.keys(G.colors).length) return;
    pushHist(); G.colors = {}; changed();
  }
  function changed() { cleanColors(); ui.hint = null; checkLesson(); checkWin(); save(); touchGame(); renderGame(); }
  function checkLesson() {
    const L = G.lesson;
    if (G.mode !== 'lesson' || !L || L.done) return;
    const s = L.step;
    const ok = s.place ? G.values[s.place.cell] === s.place.d
      : s.elims.every(e => G.values[e.cell] === G.solution[e.cell] || (G.notes[e.cell] && !(G.notes[e.cell] & bit(e.d))));
    if (ok) { L.done = true; stats.lessons[G.tech] = (stats.lessons[G.tech] || 0) + 1; saveStats(); }
  }
  function checkWin() {
    if (G.won || !G.values.every((v, i) => v === G.solution[i])) return;
    G.won = true; ui.sel = -1;
    if (counts()) {
      const sc = scoreFor(G), L = stats.levels[G.level] = stats.levels[G.level] || {};
      G.score = sc;
      L.solved = (L.solved || 0) + 1;
      L.time = (L.time || 0) + G.elapsed;
      if (!L.bestTime || G.elapsed < L.bestTime) L.bestTime = G.elapsed;
      const bestAll = (agg().levels[G.level] || {}).bestScore || 0;
      if (sc.total > bestAll) G.record = true;
      if (!L.bestScore || sc.total > L.bestScore) L.bestScore = sc.total;
      L.points = (L.points || 0) + sc.total;
      stats.total = (stats.total || 0) + sc.total;
      saveStats();
    }
  }

  // ================= Tipps =================
  function solverCands() {
    const c = S.initCands(G.values);
    for (let i = 0; i < 81; i++) if (!G.values[i] && G.notes[i]) c[i] &= G.notes[i];
    return c;
  }
  function hint() {
    if (!G || G.won) return;
    if (ui.hint) { if (ui.hint.stage === 1) { ui.hint.stage = 2; prepareStage2(); renderGame(); } return; }
    if (G.mode === 'lesson' && !G.lesson.done) { ui.hint = { kind: 'step', step: G.lesson.step, stage: 1 }; renderGame(); return; }
    const wrong = [], badNotes = [];
    for (let i = 0; i < 81; i++) {
      if (G.values[i] && G.values[i] !== G.solution[i]) wrong.push(i);
      else if (!G.values[i] && G.notes[i] && !(G.notes[i] & bit(G.solution[i]))) badNotes.push(i);
    }
    if (wrong.length) { ui.hint = { kind: 'wrong', cells: wrong, stage: 2 }; renderGame(); return; }
    if (badNotes.length) { ui.hint = { kind: 'notes', cells: badNotes, stage: 2 }; renderGame(); return; }
    const c = solverCands(), step = S.findStep(G.values.slice(), c);
    if (!step) { toast('Hier komme ich mit meinen Techniken nicht weiter.'); return; }
    G.hints++;
    ui.hint = { kind: 'step', step, stage: 1, cands: c };
    save(); renderGame();
  }
  function prepareStage2() {
    const h = ui.hint;
    if (h.kind !== 'step' || h.step.place) return;
    const need = [...h.step.elims.map(e => e.cell), ...h.step.cells];
    if (need.some(i => !G.values[i] && !G.notes[i])) {
      pushHist();
      const c = h.cands || solverCands();
      for (let i = 0; i < 81; i++) if (!G.values[i] && !G.notes[i]) G.notes[i] = c[i];
      h.filled = true; save();
    }
  }
  function applyHint() {
    const h = ui.hint;
    if (!h) return;
    pushHist();
    if (h.kind === 'wrong') for (const i of h.cells) G.values[i] = 0;
    else if (h.kind === 'notes') { const c = S.initCands(G.values); for (const i of h.cells) G.notes[i] = c[i]; }
    else {
      const s = h.step;
      if (s.place) { G.values[s.place.cell] = s.place.d; for (const p of S.PEERS[s.place.cell]) G.notes[p] &= ~bit(s.place.d); ui.sel = s.place.cell; }
      else { const c = h.cands || solverCands(); for (const e of s.elims) { if (!G.notes[e.cell]) G.notes[e.cell] = c[e.cell]; G.notes[e.cell] &= ~bit(e.d); } }
    }
    changed();
  }

  // ================= Brett =================
  function highlights() {
    const H = { unit: new Set(), key: new Set(), err: new Set(), elim: {}, nkey: {}, ghost: null, color: {} };
    const h = ui.hint;
    if (!h) return H;
    if (h.kind !== 'step') { h.cells.forEach(i => H.err.add(i)); return H; }
    const s = h.step, units = [];
    if (s.unit != null) units.push(s.unit);
    if (s.baseUnits) units.push(...s.baseUnits);
    if (h.stage === 1) {
      if (s.tech === 'naked1') H.key.add(s.cells[0]);
      if (s.tech === 'ywing') H.key.add(s.pivot);
    } else {
      if (s.line != null) units.push(s.line);
      if (s.coverUnits) units.push(...s.coverUnits);
      s.cells.forEach(i => H.key.add(i));
      for (const e of s.elims) (H.elim[e.cell] = H.elim[e.cell] || new Set()).add(e.d);
      const kd = s.digits || (s.digit ? [s.digit] : []);
      s.cells.forEach(i => (H.nkey[i] = new Set(s.tech === 'ywing' || s.allNotes ? S.DIG[G.notes[i]] : kd)));
      if (s.colorA) { s.colorA.forEach(i => (H.color[i * 10 + s.digit] = '#E5484D')); s.colorB.forEach(i => (H.color[i * 10 + s.digit] = '#2F80ED')); }
      if (s.chainCells) s.chainCells.forEach(i => H.unit.add(i));
      if (s.contraCell != null) H.err.add(s.contraCell);
      if (s.contraUnit != null) S.UNITS[s.contraUnit].forEach(i => H.unit.add(i));
      if (s.place) H.ghost = s.place;
    }
    units.forEach(u => S.UNITS[u].forEach(i => H.unit.add(i)));
    return H;
  }

  // gemeinsamer Zellen-Renderer für Spiel und Beispielbilder
  function cellsHTML(o) {
    let html = '';
    for (let i = 0; i < 81; i++) {
      const r = S.R(i), c = S.C(i), v = o.values[i];
      const cls = ['cell'];
      if (c === 2 || c === 5) cls.push('br');
      if (r === 2 || r === 5) cls.push('bb');
      if (r === 8) cls.push('lr');
      const st = o.state(i);
      if (st) cls.push(st);
      if (o.flash === i) cls.push('flash');
      let inner = '';
      if (v) inner = `<span class="v ${o.given(i) ? 'given' : 'user'}${o.wrong(i) ? ' wrong' : ''}">${v}</span>`;
      else if (o.ghost && o.ghost.cell === i) inner = `<span class="ghost">${o.ghost.d}</span>`;
      else if (o.ghosts && o.ghosts[i]) inner = `<span class="ghost ${o.ghosts[i].cls || ''}">${o.ghosts[i].d}</span>`;
      else if (o.notes[i]) {
        inner = '<span class="notes">';
        for (let d = 1; d <= 9; d++) {
          if (!(o.notes[i] & bit(d))) { inner += '<span></span>'; continue; }
          const col = o.noteColor ? o.noteColor(i, d) : null;
          inner += `<span class="${o.noteCls(i, d)}${col ? ' col' : ''}"${col ? ` style="background:${col};color:${chipInk(col)}"` : ''}>${d}</span>`;
        }
        inner += '</span>';
      }
      const tag = o.interactive ? 'button' : 'div';
      const label = o.interactive ? ` aria-label="Zeile ${r + 1}, Spalte ${c + 1}${v ? ', ' + v : ''}"` : '';
      html += `<${tag} class="${cls.join(' ')}" data-i="${i}"${label}>${inner}</${tag}>`;
    }
    return html;
  }

  function renderBoard() {
    const H = highlights(), sel = ui.sel, selVal = sel >= 0 ? G.values[sel] : 0, quiet = !!ui.hint;
    $('board').innerHTML = cellsHTML({
      values: G.values, notes: G.notes, ghost: H.ghost, flash: ui.flash, interactive: true,
      given: i => !!G.puzzle[i], wrong: i => !G.puzzle[i] && G.values[i] !== G.solution[i],
      state: i => H.err.has(i) ? 'errhl' : i === sel ? 'sel' : H.key.has(i) ? 'key' : H.unit.has(i) ? 'unit'
        : !quiet && selVal && G.values[i] === selVal ? 'same' : !quiet && sel >= 0 && S.SEES[sel][i] ? 'peer' : '',
      noteCls: (i, d) => H.elim[i] && H.elim[i].has(d) ? 'nelim' : H.nkey[i] && H.nkey[i].has(d) ? 'nkey' : !quiet && selVal === d ? 'nhl' : '',
      noteColor: (i, d) => H.color[i * 10 + d] || (G.colors && G.colors[i * 10 + d]) || null
    });
    ui.flash = -1;
  }

  function miniBoard(ex) {
    const values = new Array(81).fill(0), notes = new Array(81).fill(0);
    for (const k in ex.g) values[k] = ex.g[k];
    for (const k in ex.n || {}) notes[k] = ex.n[k].reduce((m, d) => m | bit(d), 0);
    const unit = new Set((ex.units || []).flatMap(u => S.UNITS[u])), key = new Set(ex.key || []), same = new Set(ex.same || []), err = new Set(ex.err || []);
    const elim = ex.elim || {}, dg = new Set(ex.digits || []), colors = ex.colors || {};
    const ghosts = {};
    (ex.ghosts || []).forEach(x => (ghosts[x.cell] = x));
    err.forEach(i => (ghosts[i] = { d: '∅', cls: 'bad' }));
    return `<div class="mini"><div class="board" aria-hidden="true">${cellsHTML({
      values, notes, ghost: ex.ghost, ghosts, flash: -1, interactive: false,
      given: () => true, wrong: () => false,
      state: i => err.has(i) ? 'errhl' : key.has(i) ? 'key' : same.has(i) ? 'same' : unit.has(i) ? 'unit' : '',
      noteCls: (i, d) => (elim[i] || []).includes(d) ? 'nelim' : key.has(i) && (ex.all || dg.has(d)) ? 'nkey' : '',
      noteColor: (i, d) => colors[i * 10 + d] || null
    })}</div></div>`;
  }

  // ================= Bildschirme =================
  function renderMenu() {
    const A = agg();
    const cont = G && !G.won ? (G.mode === 'lesson' ? `Training · ${S.TECH[G.tech].name}` : `${LEVELS[G.level]} · ${fmt(G.elapsed)}`) : null;
    const logo = [1, 0, 0, 0, 1, 0, 0, 0, 1].map(a => `<i class="${a ? 'a' : ''}"></i>`).join('');
    const item = (nav, title, sub, primary) => `<button class="mbtn${primary ? ' primary' : ''}" data-nav="${nav}"><span><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span><span class="chev">${ICON.chev}</span></button>`;
    $('app').className = 'app';
    $('app').innerHTML = `<div class="menu">
      <div class="logo"><div class="logo-grid" aria-hidden="true">${logo}</div><h1>Sudoku-Schule</h1><p>${pts(A.total || 0)} Punkte</p></div>
      <nav class="mlist">
        ${cont ? item('continue', 'Weiterspielen', cont, true) : ''}
        ${item('level', 'Neues Spiel', 'Zehn Stufen vom Einsteiger bis zum Großmeister', !cont)}
        ${item('training', 'Training', `${S.TECHS.length} Lösungstechniken mit Beispielen`)}
        ${item('stats', 'Statistik', 'Punkte, Zeiten, Trainingsstand')}
        ${SYNC ? item('account', 'Konto & Synchronisation', accountLine()) : ''}
        ${item('options', 'Optionen', 'Farben und Zurücksetzen')}
      </nav></div>`;
  }

  function accountLine() {
    const st = SYNC.state;
    if (!st.available) return 'Nur auf diesem Gerät, Synchronisation nicht eingerichtet';
    if (!st.user) return 'Nicht angemeldet · Fortschritt nur auf diesem Gerät';
    if (!st.user.verified) return `${st.user.email} · E-Mail noch nicht bestätigt`;
    return `${st.user.email} · ${syncStatusText(st)}`;
  }
  function ago(t) {
    if (!t) return 'noch nie';
    const s2 = Math.round((Date.now() - t) / 1000);
    if (s2 < 60) return 'gerade eben';
    if (s2 < 3600) return `vor ${Math.round(s2 / 60)} Min.`;
    if (s2 < 86400) return `vor ${Math.round(s2 / 3600)} Std.`;
    return new Date(t).toLocaleDateString('de-DE');
  }
  function syncStatusText(st) {
    if (st.status === 'offline') return 'offline, wird später abgeglichen';
    if (st.status === 'syncing') return 'wird abgeglichen …';
    if (st.status === 'error') return 'Abgleich fehlgeschlagen';
    return `abgeglichen ${ago(st.lastSync)}`;
  }

  function renderAccount() {
    $('app').className = 'app';
    const st = SYNC.state, u = st.user, busy = ui.accBusy ? 'disabled' : '';
    const keep = {};
    document.querySelectorAll('#app input').forEach(x => (keep[x.id] = x.value));
    const msgBox = ui.accMsg ? `<div class="note ${ui.accMsg.type}">${ui.accMsg.text}</div>` : '';
    let body = '';
    if (!st.available) {
      body = `<div class="note task">In dieser Version ist die Synchronisation nicht eingerichtet. Du spielst offline, alles bleibt auf diesem Gerät.</div>`;
    } else if (!u) {
      const mode = ui.accMode || 'login';
      const tabs = `<div class="levels" role="group" style="align-self:flex-start"><button data-accmode="login" aria-pressed="${mode === 'login'}">Anmelden</button><button data-accmode="register" aria-pressed="${mode === 'register'}">Registrieren</button></div>`;
      const fields = mode === 'reset'
        ? `<label class="field"><span>E-Mail</span><input type="email" id="acc-email" autocomplete="email" inputmode="email"></label>
           <button class="btn primary block" data-act="accreset" ${busy}>Link zum Zurücksetzen senden</button>
           <button class="textlink" data-accmode="login">Zurück zur Anmeldung</button>`
        : `${tabs}
           <label class="field"><span>E-Mail</span><input type="email" id="acc-email" autocomplete="email" inputmode="email"></label>
           <label class="field"><span>Passwort</span><input type="password" id="acc-pw" autocomplete="${mode === 'register' ? 'new-password' : 'current-password'}"></label>
           ${mode === 'register' ? '<label class="field"><span>Passwort wiederholen</span><input type="password" id="acc-pw2" autocomplete="new-password"></label>' : ''}
           <button class="btn primary block" data-act="${mode === 'register' ? 'accregister' : 'acclogin'}" ${busy}>${mode === 'register' ? 'Konto anlegen' : 'Anmelden'}</button>
           ${mode === 'login' ? '<button class="textlink" data-accmode="reset">Passwort vergessen?</button>' : '<p class="sub">Nach dem Anlegen bekommst du eine E-Mail mit einem Bestätigungslink. Erst danach wird synchronisiert.</p>'}
           ${st.googleAvailable ? `<div class="divider"><span>oder</span></div><button class="btn block" data-act="accgoogle" ${busy}>Mit Google anmelden</button>` : ''}`;
      body = `<p class="sub">Ohne Konto spielst du offline, und alles bleibt auf diesem Gerät. Mit einem Konto werden Punkte, Statistik, Trainingsstand, Farben und dein laufendes Spiel zwischen deinen Geräten abgeglichen. Dein bisheriger Fortschritt wird dabei übernommen.</p>
        <div class="list" style="padding:16px;display:flex;flex-direction:column;gap:12px">${fields}</div>`;
    } else if (!u.verified) {
      body = `<div class="list" style="padding:16px;display:flex;flex-direction:column;gap:12px">
        <b>Bitte bestätige deine E-Mail-Adresse</b>
        <p class="sub" style="margin:0">Wir haben einen Link an <b>${u.email}</b> geschickt. Öffne ihn und tippe dann auf „Ich habe bestätigt“. Schau auch im Spam-Ordner nach.</p>
        <button class="btn primary block" data-act="acccheck" ${busy}>Ich habe bestätigt</button>
        <div class="row"><button class="btn" data-act="accresend" ${busy}>Link erneut senden</button><button class="btn" data-act="acclogout" ${busy}>Abmelden</button></div></div>`;
    } else {
      body = `<div class="list">
          <div class="item"><span><b>${u.email}</b><small>${u.provider === 'google' ? 'Angemeldet mit Google' : 'Angemeldet mit E-Mail und Passwort'}</small></span></div>
          <div class="item"><span><b>Synchronisation</b><small>${syncStatusText(st)}${st.status === 'error' && st.error ? ': ' + st.error : ''}</small></span><button class="btn" data-act="accsync" ${busy}>Jetzt abgleichen</button></div>
        </div>
        <p class="sub" style="margin:0">Beim Abmelden bleibt dein Stand auf diesem Gerät erhalten.</p>
        <button class="btn block" data-act="acclogout" ${busy}>Abmelden</button>
        <section class="group" style="margin-top:12px"><h2>Konto löschen</h2><div class="list" style="padding:16px;display:flex;flex-direction:column;gap:12px">
          <p class="sub" style="margin:0">Löscht dein Konto und alle gespeicherten Daten auf dem Server. Der Stand auf diesem Gerät bleibt erhalten.</p>
          ${ui.delOpen ? `${u.provider === 'password' ? '<label class="field"><span>Passwort zur Bestätigung</span><input type="password" id="del-pw" autocomplete="current-password"></label>' : '<p class="sub" style="margin:0">Zur Bestätigung meldest du dich noch einmal mit Google an.</p>'}
            <div class="row"><button class="btn danger solid" data-act="accdelete" ${busy}>Konto endgültig löschen</button><button class="btn" data-act="accdelcancel">Abbrechen</button></div>`
          : '<button class="btn danger" data-act="accdelopen" style="align-self:flex-start">Konto löschen …</button>'}
        </div></section>`;
    }
    $('app').innerHTML = `${header('Konto & Synchronisation')}<div class="prose" style="gap:14px">${msgBox}${body}</div>`;
    for (const id in keep) { const x = $(id); if (x) x.value = keep[id]; }
  }
  async function accountAction(fn, okText) {
    ui.accBusy = true; ui.accMsg = null; renderAccount();
    try {
      await fn();
      ui.accMsg = okText ? { type: 'ok', text: okText } : null;
    } catch (e) {
      ui.accMsg = { type: 'err', text: e.message };
    }
    ui.accBusy = false;
    if (ui.screen === 'account') renderAccount();
  }
  const val = id => ($(id) ? $(id).value : '');

  function renderLevel() {
    const A = agg();
    $('app').className = 'app';
    const rows = LV.map(l => {
      const L = A.levels[l] || {};
      return `<button class="item" data-start="${l}"><span><b>${l}. ${LEVELS[l]}</b><small>${LEVEL_DESC[l]}</small></span><span class="badge">${dots(l)}<br>${L.bestScore ? pts(L.bestScore) + ' P.' : ''}</span></button>`;
    }).join('');
    $('app').innerHTML = `${header('Neues Spiel')}<div class="list">${rows}</div>
      <p class="sub" style="margin:16px 4px 0">Punkte pro Spiel: Grundwert je Stufe (500 bis 10.000), bis zu +50 % Zeitbonus, −10 % pro Fehler, −5 % pro Tipp und einmalig −15 %, wenn du alle Kandidaten automatisch eintragen lässt.</p>`;
  }

  function renderTraining() {
    const A = agg();
    $('app').className = 'app';
    let html = header('Training');
    for (const l of LV) {
      if (!S.TECHS.some(t => t.level === l)) continue;
      const items = S.TECHS.filter(t => t.level === l).map(t => {
        const c = A.lessons[t.id];
        return `<button class="item" data-tech="${t.id}"><span><b>${t.name}</b><small>${INFO[t.id][0]}</small></span><span class="badge${c ? ' ok' : ''}">${c ? c + '× gelöst' : ICON.chev}</span></button>`;
      }).join('');
      html += `<section class="group"><h2>${dots(l)} ab Stufe ${l} · ${LEVELS[l]}</h2><div class="list">${items}</div></section>`;
    }
    $('app').innerHTML = html;
  }

  function renderDetail() {
    const A = agg();
    const t = S.TECH[ui.tech], ex = EX[ui.tech];
    $('app').className = 'app';
    const legend = ui.tech === 'forcing'
      ? '<div class="legend"><span style="color:var(--accent);font-weight:700">5</span><span>Annahme</span><span style="color:var(--ok);font-weight:700">7</span><span>Folgerung</span><span><i style="background:var(--err-soft)"></i>Widerspruch</span></div>'
      : ex.elim
      ? '<div class="legend"><span><i style="background:var(--key)"></i>Schlüsselfelder</span><span><i style="background:var(--unit)"></i>Betroffener Bereich</span><span style="color:var(--err);text-decoration:line-through;font-weight:700">4</span><span>fällt weg</span></div>'
      : '<div class="legend"><span><i style="background:var(--unit)"></i>Betrachteter Bereich</span><span style="color:var(--ok);font-weight:700">7</span><span>gefundene Ziffer</span></div>';
    $('app').innerHTML = `${header(t.name)}
      <div class="prose">
        <div class="eyebrow">${dots(t.level)} gebraucht ab Stufe ${t.level} · ${LEVELS[t.level]}</div>
        <p>${INFO[ui.tech][1]}</p>
        <figure class="figure" style="margin:0">${miniBoard(ex)}${legend}<figcaption>${ex.cap}</figcaption></figure>
        <button class="btn primary block" data-lesson="${ui.tech}">Aufgabe starten</button>
        ${A.lessons[ui.tech] ? `<p class="sub" style="text-align:center">Bisher ${A.lessons[ui.tech]}× gelöst.</p>` : ''}
      </div>`;
  }

  function renderStats() {
    const A = agg();
    $('app').className = 'app';
    const rows = LV.map(l => {
      const L = A.levels[l] || {};
      return `<tr><td>${LEVELS[l]}</td><td>${L.solved || 0}</td><td>${L.bestScore ? pts(L.bestScore) : '–'}</td><td>${L.bestTime ? fmt(L.bestTime) : '–'}</td><td>${L.solved ? fmt(Math.round(L.time / L.solved)) : '–'}</td></tr>`;
    }).join('');
    const tech = S.TECHS.map(t => `<div class="item"><span><b>${t.name}</b></span><span class="badge${A.lessons[t.id] ? ' ok' : ''}">${A.lessons[t.id] ? A.lessons[t.id] + '× gelöst' : 'noch offen'}</span></div>`).join('');
    const solvedAll = LV.reduce((a, l) => a + ((A.levels[l] || {}).solved || 0), 0);
    const learned = S.TECHS.filter(t => A.lessons[t.id]).length;
    $('app').innerHTML = `${header('Statistik')}
      <div class="big"><div class="score">${pts(A.total || 0)}</div><small>Punkte insgesamt · ${solvedAll} Spiele gelöst</small></div>
      <section class="group"><h2>Spiele</h2><div class="tablewrap"><table class="stats">
        <tr><th>Stufe</th><th>Gelöst</th><th>Rekord</th><th>Bestzeit</th><th>Ø Zeit</th></tr>${rows}</table></div></section>
      <section class="group"><h2>Training · ${learned} von ${S.TECHS.length} Techniken geübt</h2><div class="list">${tech}</div></section>`;
  }

  function renderOptions() {
    $('app').className = 'app';
    const cur = currentColors();
    const sw = PRESETS.map(p => `<button class="sw" data-preset="${p.id}" aria-pressed="${settings && settings.preset === p.id}"><span class="chip" style="background:${p.bg}"><i style="background:${p.accent}"></i></span>${p.name}</button>`).join('');
    $('app').innerHTML = `${header('Optionen')}
      <section class="group"><h2>Farben</h2><div class="list">
        <div class="swatches">${sw}</div>
        <div class="pick"><span style="font-weight:600">Akzentfarbe</span><button class="colorbtn" data-act="pickaccent" aria-label="Akzentfarbe wählen" style="background:${cur.accent}"></button></div>
        <div class="pick"><span style="font-weight:600">Hintergrund</span><button class="colorbtn" data-act="pickbg" aria-label="Hintergrund wählen" style="background:${cur.bg}"></button></div>
        <div class="pick"><span><b style="font-weight:600">Automatisch</b><small class="sub" style="display:block;font-size:13px">Hell oder dunkel wie dein Gerät</small></span><button class="btn" data-act="autocolor" ${settings ? '' : 'disabled'}>${settings ? 'Aktivieren' : 'Aktiv'}</button></div>
      </div><p class="sub" style="margin:8px 4px 0">Text- und Linienfarben passen sich automatisch an, damit alles lesbar bleibt.</p></section>
      <section class="group"><h2>Färbe-Farben</h2><div class="list">
        <div class="paintlist">${BASE_COLORS.map(c => `<span class="swc" style="background:${c}" title="Grundfarbe"></span>`).join('')}
          ${customColors.map(c => `<button class="swc custom" data-act="delcustom" data-c="${c}" style="background:${c};color:${chipInk(c)}" aria-label="Eigene Farbe ${c} entfernen">×</button>`).join('')}
          <button class="swc add" data-act="addpaint" title="Eigene Farbe hinzufügen" aria-label="Eigene Farbe hinzufügen">+</button></div>
      </div><p class="sub" style="margin:8px 4px 0">Sechs Grundfarben sind fest. Eigene Farben fügst du mit + hinzu und entfernst sie mit ×. Im Spiel: Notizmodus, Färben einschalten, Farbe wählen, Feld antippen, dann die Ziffer.</p></section>
      <section class="group"><h2>Daten</h2><div class="list">
        <button class="item" data-act="resetprogress"><span><b>Fortschritt zurücksetzen</b><small>Löscht Punkte, Statistik und Trainingsstand.</small></span><span class="badge">${ICON.chev}</span></button>
        <button class="item" data-act="resetall"><span><b style="color:var(--err)">Komplett-Reset</b><small>Löscht zusätzlich das laufende Spiel, deine Farben und eigenen Färbe-Farben.</small></span><span class="badge">${ICON.chev}</span></button>
      </div></section>`;
  }

  // ---------- Spielbildschirm ----------
  function renderGameShell() {
    const lesson = G.mode === 'lesson';
    const title = lesson ? S.TECH[G.tech].name : G.mode === 'free' ? 'Trainingspuzzle' : LEVELS[G.level];
    $('app').className = 'app wide';
    $('app').innerHTML = `${header(title, `<span id="timer">${fmt(G.elapsed)}</span>`)}
      <section class="game" id="game">
        <div class="info" id="info"></div>
        <div class="boardwrap"><div class="board" id="board" role="grid" aria-label="Sudoku-Feld"></div><div class="over" id="overlay" hidden></div></div>
        <aside class="coach" id="coach" aria-live="polite" hidden></aside>
        <div class="tools">
          <button class="tool" data-act="undo" aria-label="Rückgängig" title="Rückgängig (Z)">${ICON.undo}</button>
          <button class="tool" data-act="erase" aria-label="Löschen" title="Löschen (Entf)">${ICON.erase}</button>
          <button class="tool" data-act="notes" id="t-notes" aria-label="Notizmodus" title="Notizen (N)" aria-pressed="false">${ICON.pencil}</button>
          <button class="tool" data-act="color" id="t-color" aria-label="Kandidaten färben" title="Färben (F)" aria-pressed="false">${ICON.paint}</button>
          <button class="tool" data-act="fill" aria-label="Alle Kandidaten eintragen" title="Alle Kandidaten eintragen">${ICON.fill}</button>
          <button class="tool" data-act="hint" aria-label="Tipp" title="Tipp (H)">${ICON.bulb}</button>
        </div>
        <div class="palette" id="palette" hidden></div>
        <div class="pad" id="pad"></div>
      </section>`;
    renderGame();
  }
  function renderGame() {
    if (ui.screen !== 'game' || !$('board')) return;
    renderBoard(); renderPad(); renderInfo(); renderCoach(); renderOverlay();
    $('game').classList.toggle('side', !$('coach').hidden);
  }
  function renderInfo() {
    const parts = [`Fehler <b>${G.mistakes}</b>`];
    if (G.mode === 'play') { parts.push(`Tipps <b>${G.hints}</b>`); parts.push(`Punkte <b id="livepts">${pts(scoreFor(G).total)}</b>`); }
    else parts.push('<span>ohne Wertung</span>');
    $('info').innerHTML = parts.map(p => `<span>${p}</span>`).join('');
  }
  function renderPad() {
    const count = new Array(10).fill(0);
    G.values.forEach((v, i) => { if (v && v === G.solution[i]) count[v]++; });
    let html = '';
    for (let d = 1; d <= 9; d++) {
      const left = 9 - count[d];
      html += `<button class="num${left === 0 ? ' done' : ''}" data-d="${d}" aria-label="Ziffer ${d}, noch ${left}"><b>${d}</b><small>${left || ''}</small></button>`;
    }
    $('pad').innerHTML = html;
    $('pad').classList.toggle('notesmode', ui.notesMode);
    $('t-notes').setAttribute('aria-pressed', ui.notesMode);
    $('t-color').setAttribute('aria-pressed', ui.colorMode);
    $('pad').classList.toggle('colormode', ui.colorMode);
    $('pad').style.setProperty('--paint', ui.color);
    renderPalette();
  }
  function renderPalette() {
    const el = $('palette');
    if (!el) return;
    el.hidden = !ui.colorMode;
    if (!ui.colorMode) { el.innerHTML = ''; return; }
    if (!allColors().includes(ui.color)) ui.color = BASE_COLORS[0];
    const sw = allColors().map(c => `<button class="swc" data-color="${c}" aria-pressed="${c === ui.color}" aria-label="Farbe ${c}" style="background:${c}"></button>`).join('');
    const isCustom = customColors.includes(ui.color);
    el.innerHTML = `${sw}<button class="swc add" data-act="addpaint" title="Eigene Farbe hinzufügen" aria-label="Eigene Farbe hinzufügen">+</button>
      <span class="palette-actions">${isCustom ? '<button class="textlink" data-act="removecolor">Farbe entfernen</button>' : ''}<button class="textlink" data-act="clearcolors">Färbungen löschen</button></span>`;
  }

  function renderCoach() {
    const el = $('coach'), h = ui.hint;
    if (G.mode === 'lesson') { el.hidden = false; return lessonCoach(el, h); }
    if (!h) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    if (h.kind === 'wrong' || h.kind === 'notes') {
      const names = h.cells.map(S.cellName).join(', ');
      const msg = h.kind === 'wrong'
        ? (h.cells.length === 1 ? `In ${names} steht eine falsche Ziffer.` : `In ${names} stehen falsche Ziffern.`) + ' Das muss erst korrigiert werden.'
        : `In ${names} fehlt die richtige Ziffer unter deinen Notizen. Irgendwo wurde zu viel gestrichen.`;
      el.innerHTML = `<div class="eyebrow">Tipp</div><div class="note err">${msg}</div>
        <div class="row"><button class="btn primary" data-act="apply">${h.kind === 'wrong' ? 'Falsche Ziffern entfernen' : 'Notizen dort korrigieren'}</button><button class="btn" data-act="close">Schließen</button></div>`;
      return;
    }
    const s = h.step;
    const body = h.stage === 1
      ? `<p>${s.short}</p><div class="row"><button class="btn primary" data-act="hint">Erklärung zeigen</button><button class="btn" data-act="close">Selbst suchen</button></div>`
      : `<p>${s.text}</p>${h.filled ? '<p class="sub">Dafür wurden die Kandidaten in die leeren Felder eingetragen.</p>' : ''}
         <div class="row"><button class="btn primary" data-act="apply">${s.place ? 'Ziffer eintragen' : 'Kandidaten streichen'}</button><button class="btn" data-act="close">Schließen</button></div>
         <button class="textlink" data-tech="${s.tech}">Technik im Training ansehen</button>`;
    el.innerHTML = `<div class="eyebrow">${dots(s.level)} Tipp</div><h2>${s.name}</h2>${body}`;
  }

  function lessonCoach(el, h) {
    const L = G.lesson, s = L.step;
    if (L.done) {
      el.innerHTML = `<div class="note ok"><strong>Richtig.</strong> ${s.text}</div>
        <div class="row"><button class="btn primary" data-act="nextlesson">Nächste Aufgabe</button><button class="btn" data-act="playon">Puzzle weiterspielen</button></div>`;
      return;
    }
    const task = s.place ? 'Finde das Feld und trag die Ziffer ein.' : 'Finde die Stelle und streiche die Kandidaten, die wegfallen. Feld wählen, dann im Notizmodus die Ziffer antippen.';
    let prog = '';
    if (!s.place) { const n = s.elims.filter(e => G.notes[e.cell] && !(G.notes[e.cell] & bit(e.d))).length; prog = `<span class="sub">${n} von ${s.elims.length} gestrichen</span>`; }
    let hp = '';
    if (h && h.stage === 1) hp = `<div class="note task">${s.short}</div>`;
    if (h && h.stage === 2) hp = `<div class="note task">${s.text}</div>`;
    const btn = !h ? '<button class="btn" data-act="hint">Fingerzeig</button>'
      : h.stage === 1 ? '<button class="btn" data-act="hint">Lösung zeigen</button>'
      : `<button class="btn primary" data-act="apply">${s.place ? 'Ziffer eintragen' : 'Kandidaten streichen'}</button>`;
    el.innerHTML = `<p>${task}</p>${prog}${hp}
      ${ui.showInfo ? `<p class="sub">${INFO[G.tech][1]}</p>` : ''}
      <div class="row">${btn}<button class="btn" data-act="nextlesson">Andere Aufgabe</button></div>
      <button class="textlink" data-act="toggleinfo">${ui.showInfo ? 'Erklärung ausblenden' : 'Erklärung einblenden'}</button>`;
  }

  function renderOverlay() {
    const o = $('overlay');
    if (!G.won) { o.hidden = true; o.innerHTML = ''; return; }
    o.hidden = false;
    if (G.mode !== 'play' || !G.score) {
      o.innerHTML = `<div class="card"><h3>Gelöst</h3><p class="sub" style="margin:0">Zeit ${fmt(G.elapsed)} · ${G.mistakes} Fehler. Trainingspuzzles zählen nicht für die Punkte.</p>
        <div class="row"><button class="btn primary" data-nav="training">Training</button><button class="btn" data-nav="menu">Hauptmenü</button></div></div>`;
      return;
    }
    const sc = G.score;
    o.innerHTML = `<div class="card">
      <div class="eyebrow">${LEVELS[G.level]} gelöst</div>
      <div class="score">${pts(sc.total)}</div>
      ${G.record ? '<div class="note ok"><strong>Neuer Rekord</strong> für diese Stufe.</div>' : ''}
      <table class="calc">
        <tr><td>Grundpunkte</td><td>${pts(sc.base)}</td></tr>
        <tr><td>Zeitbonus (${fmt(G.elapsed)})</td><td class="pos">+${pts(sc.bonus)}</td></tr>
        <tr><td>${G.mistakes} Fehler</td><td class="neg">−${pts(sc.errPen)}</td></tr>
        <tr><td>${G.hints} Tipps</td><td class="neg">−${pts(sc.hintPen)}</td></tr>
        ${G.autofilled ? `<tr><td>Kandidaten automatisch</td><td class="neg">−${pts(sc.autoPen)}</td></tr>` : ''}
        <tr class="sum"><td>Gesamt${sc.floored ? ' (Minimum)' : ''}</td><td>${pts(sc.total)}</td></tr>
      </table>
      <div class="row"><button class="btn primary" data-nav="level">Neues Spiel</button><button class="btn" data-nav="menu">Hauptmenü</button></div>
    </div>`;
  }

  const PICK_HUES = [0, 20, 38, 52, 75, 120, 155, 180, 200, 220, 245, 270, 295, 325];
  const hsl = (h, s2, l) => { s2 /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s2 * Math.min(l, 1 - l); const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return rgb2hex([f(0) * 255, f(8) * 255, f(4) * 255]).toUpperCase(); };
  const PICK_COLORS = [].concat(
    ...[[85, 30], [75, 45], [80, 60], [70, 75], [60, 90]].map(([sat, l]) => PICK_HUES.map(h => hsl(h, sat, l))),
    ['#FFFFFF', '#F4F5F7', '#D9DCE3', '#9AA0AE', '#5A6070', '#2E323C', '#1B1E25', '#14161B', '#0F1A1C', '#000000']
  );
  function openPicker(title, value, onPick) { ui.picker = { title, value: value.toUpperCase(), onPick }; renderModal(); }
  function renderPicker(m) {
    const p = ui.picker;
    m.hidden = false;
    m.innerHTML = `<div class="card picker" role="dialog" aria-modal="true"><h3>${p.title}</h3>
      <div class="pickgrid">${PICK_COLORS.map(c => `<button class="pc" data-pick="${c}" style="background:${c}" aria-label="${c}" aria-pressed="${c === p.value}"></button>`).join('')}</div>
      <div class="pickrow"><span class="pickprev" id="pick-prev" style="background:${p.value}"></span><input type="text" id="pick-hex" value="${p.value}" maxlength="7" spellcheck="false" autocomplete="off" aria-label="Farbcode"></div>
      <div class="row"><button class="btn primary" data-act="pickok">Übernehmen</button><button class="btn" data-act="pickcancel">Abbrechen</button></div></div>`;
  }
  function renderModal() {
    const m = $('modal');
    if (ui.busy) return;
    if (ui.picker) return renderPicker(m);
    if (!ui.modal) { m.hidden = true; m.innerHTML = ''; return; }
    const d = ui.modal;
    m.hidden = false;
    m.innerHTML = `<div class="card" role="dialog" aria-modal="true"><h3>${d.title}</h3><p class="sub" style="margin:0">${d.text}</p>
      <div class="row"><button class="btn ${d.danger ? 'danger solid' : 'primary'}" data-act="modalok">${d.ok}</button><button class="btn" data-act="modalcancel">Abbrechen</button></div></div>`;
  }

  function render() {
    applyTheme();
    if (ui.screen === 'game' && !G) ui.screen = 'menu';
    ({ menu: renderMenu, level: renderLevel, training: renderTraining, detail: renderDetail, stats: renderStats, options: renderOptions, account: renderAccount, game: renderGameShell })[ui.screen]();
    renderModal();
  }

  let toastT;
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 3200); }

  // ================= Ereignisse =================
  function act(a, el) {
    switch (a) {
      case 'undo': return undo();
      case 'erase': return erase();
      case 'notes': ui.notesMode = !ui.notesMode; if (!ui.notesMode) ui.colorMode = false; return renderPad();
      case 'color': ui.colorMode = !ui.colorMode; if (ui.colorMode) ui.notesMode = true; return renderPad();
      case 'clearcolors': return clearColors();
      case 'acclogin': return accountAction(() => SYNC.signIn(val('acc-email'), val('acc-pw')));
      case 'accregister':
        if (val('acc-pw') !== val('acc-pw2')) { ui.accMsg = { type: 'err', text: 'Die beiden Passwörter stimmen nicht überein.' }; return renderAccount(); }
        return accountAction(() => SYNC.signUp(val('acc-email'), val('acc-pw')), 'Konto angelegt. Bitte bestätige jetzt deine E-Mail-Adresse.');
      case 'accreset': return accountAction(() => SYNC.resetPassword(val('acc-email')), 'Falls es ein Konto mit dieser Adresse gibt, ist der Link unterwegs. Schau auch im Spam-Ordner nach.');
      case 'accgoogle': return accountAction(() => SYNC.google());
      case 'accresend': return accountAction(() => SYNC.resendVerification(), 'Der Link wurde noch einmal gesendet.');
      case 'acccheck': return accountAction(async () => { if (!(await SYNC.checkVerified())) throw new Error('Die Adresse ist noch nicht bestätigt. Öffne zuerst den Link in der E-Mail.'); }, 'Bestätigt. Dein Fortschritt wird jetzt abgeglichen.');
      case 'accsync': return accountAction(() => SYNC.syncNow());
      case 'acclogout': return accountAction(() => SYNC.signOut(), 'Abgemeldet. Dein Stand bleibt auf diesem Gerät.');
      case 'accdelopen': ui.delOpen = true; return renderAccount();
      case 'accdelcancel': ui.delOpen = false; return renderAccount();
      case 'accdelete': return accountAction(async () => { await SYNC.deleteAccount(val('del-pw')); ui.delOpen = false; }, 'Dein Konto und die Daten auf dem Server sind gelöscht.');
      case 'pickok': { const p = ui.picker; ui.picker = null; renderModal(); if (/^#[0-9A-F]{6}$/.test(p.value)) p.onPick(p.value); return; }
      case 'pickcancel': ui.picker = null; return renderModal();
      case 'pickaccent': case 'pickbg': {
        const key = a === 'pickbg' ? 'bg' : 'accent', cur = currentColors();
        return openPicker(key === 'bg' ? 'Hintergrund' : 'Akzentfarbe', cur[key], v => {
          settings = { bg: cur.bg, accent: cur.accent, preset: null }; settings[key] = v;
          store.set('ss-settings', settings); touchSettings(); applyTheme(); renderOptions();
        });
      }
      case 'addpaint': return openPicker('Eigene Färbe-Farbe', '#FF66AA', v => {
        if (!allColors().includes(v)) { customColors.push(v); saveCustom(); }
        ui.color = v;
        ui.screen === 'game' ? renderPalette() : renderOptions();
      });
      case 'cancelgen': ui.genToken++; return hideBusy();
      case 'removecolor': customColors = customColors.filter(c => c !== ui.color); saveCustom(); ui.color = BASE_COLORS[0]; return ui.screen === 'game' ? renderPalette() : renderOptions();
      case 'delcustom': customColors = customColors.filter(c => c !== el.dataset.c); saveCustom(); return renderOptions();
      case 'fill': {
        if (!G || G.won) return;
        const scored = G.mode === 'play';
        const pen = scored && !G.autofilled ? `<br><br>Dafür werden einmalig 15 % der Grundpunkte abgezogen (${pts(0.15 * BASE[G.level])} Punkte).` : scored ? '<br><br>Der Abzug von 15 % wurde in diesem Spiel schon verrechnet.' : '';
        ui.modal = { title: 'Alle Kandidaten eintragen?', text: `Möchtest du wirklich alle Kandidaten eintragen?${pen}`, ok: 'Eintragen', run: () => { if (scored) G.autofilled = true; fillCands(); } };
        return renderModal();
      }
      case 'hint': return hint();
      case 'close': ui.hint = null; return renderGame();
      case 'apply': return applyHint();
      case 'nextlesson': return startLesson(G.tech);
      case 'playon': G.mode = 'free'; ui.notesMode = false; ui.colorMode = false; ui.hint = null; save(); touchGame(); return renderGameShell();
      case 'toggleinfo': ui.showInfo = !ui.showInfo; return renderCoach();
      case 'modalok': { const run = ui.modal.run; ui.modal = null; renderModal(); return run(); }
      case 'modalcancel': ui.modal = null; return renderModal();
      case 'autocolor': settings = null; store.del('ss-settings'); touchSettings(); return renderOptions(), applyTheme();
      case 'resetprogress':
        ui.modal = { title: 'Fortschritt zurücksetzen?', text: `Punkte, Statistik und Trainingsstand werden gelöscht. Dein laufendes Spiel und deine Farben bleiben.${SYNC && SYNC.state.user ? ' Das gilt auch für deine anderen Geräte.' : ''}`, ok: 'Zurücksetzen', danger: true,
          run: () => { meta.epoch++; saveMeta(); stats = freshStats(); others = []; store.set('ss-others', others); saveStats(); toast('Fortschritt zurückgesetzt.'); render(); } };
        return renderModal();
      case 'resetall':
        ui.modal = { title: 'Alles zurücksetzen?', text: 'Punkte, Statistik, Trainingsstand, das laufende Spiel, deine Farben und eigenen Färbe-Farben werden gelöscht.', ok: 'Alles löschen', danger: true,
          run: () => { meta.epoch++; saveMeta(); stats = freshStats(); others = []; store.set('ss-others', others); saveStats(); settings = null; store.del('ss-settings'); customColors = []; saveCustom(); store.del('ss-spare'); bg = null; G = null; save(); touchGame(); toast('Alles zurückgesetzt.'); go('menu'); } };
        return renderModal();
    }
  }

  document.addEventListener('click', e => {
    const t = e.target;
    let b;
    if ((b = t.closest('#board .cell'))) {
      const i = +b.dataset.i;
      ui.sel = ui.sel === i ? -1 : i;
      if (ui.hint && ui.hint.kind !== 'step') ui.hint = null;
      return renderBoard();
    }
    if ((b = t.closest('.num'))) return input(+b.dataset.d);
    if ((b = t.closest('[data-nav]'))) {
      const nav = b.dataset.nav;
      if (nav === 'continue') return go('game');
      if (nav === 'detail') return go('detail', { tech: G && G.tech });
      return go(nav);
    }
    if ((b = t.closest('[data-start]'))) return requestNewGame(+b.dataset.start);
    if ((b = t.closest('[data-tech]'))) return go('detail', { tech: b.dataset.tech });
    if ((b = t.closest('[data-lesson]'))) return startLesson(b.dataset.lesson);
    if ((b = t.closest('[data-accmode]'))) { ui.accMode = b.dataset.accmode; ui.accMsg = null; return renderAccount(); }
    if ((b = t.closest('[data-pick]'))) { ui.picker.value = b.dataset.pick; return renderPicker($('modal')); }
    if ((b = t.closest('[data-color]'))) { ui.color = b.dataset.color; return renderPalette(); }
    if ((b = t.closest('[data-preset]'))) {
      const p = PRESETS.find(x => x.id === b.dataset.preset);
      settings = { bg: p.bg, accent: p.accent, preset: p.id }; store.set('ss-settings', settings); touchSettings();
      applyTheme(); return renderOptions();
    }
    if ((b = t.closest('[data-act]'))) return act(b.dataset.act, b);
  });

  document.addEventListener('input', e => {
    if (e.target.id !== 'pick-hex' || !ui.picker) return;
    let v = e.target.value.trim().toUpperCase();
    if (v && v[0] !== '#') v = '#' + v;
    if (/^#[0-9A-F]{6}$/.test(v)) { ui.picker.value = v; const pv = $('pick-prev'); if (pv) pv.style.background = v; }
  });
  document.addEventListener('keydown', e => {
    if (ui.screen === 'account' && e.key === 'Enter' && e.target.tagName === 'INPUT') {
      const btn = document.querySelector('#app .btn.primary.block'); if (btn) btn.click(); return;
    }
    if (ui.picker && e.key === 'Escape') { ui.picker = null; return renderModal(); }
    if (ui.modal && e.key === 'Escape') { ui.modal = null; return renderModal(); }
    if (ui.screen !== 'game' || !G || e.metaKey || e.ctrlKey || e.altKey || ui.modal || ui.picker || ui.busy) return;
    if (e.target && e.target.tagName === 'INPUT') return;
    const k = e.key;
    if (/^[1-9]$/.test(k)) { input(+k); e.preventDefault(); return; }
    if (k === 'Backspace' || k === 'Delete' || k === '0') { erase(); e.preventDefault(); return; }
    if (k === 'n' || k === 'N') { ui.notesMode = !ui.notesMode; if (!ui.notesMode) ui.colorMode = false; return renderPad(); }
    if (k === 'f' || k === 'F') { ui.colorMode = !ui.colorMode; if (ui.colorMode) ui.notesMode = true; return renderPad(); }
    if (k === 'h' || k === 'H') return hint();
    if (k === 'z' || k === 'Z') return undo();
    if (k === 'Escape') { ui.hint = null; ui.sel = -1; return renderGame(); }
    const mv = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k];
    if (mv) {
      e.preventDefault();
      if (ui.sel < 0) ui.sel = 40;
      else ui.sel = ((S.R(ui.sel) + mv[0] + 9) % 9) * 9 + ((S.C(ui.sel) + mv[1] + 9) % 9);
      renderBoard();
    }
  });

  setInterval(() => {
    if (!G || G.won || ui.busy || ui.modal || ui.screen !== 'game' || document.hidden) return;
    G.elapsed++;
    const t = $('timer'); if (t) t.textContent = fmt(G.elapsed);
    const lp = $('livepts'); if (lp) lp.textContent = pts(scoreFor(G).total);
    if (G.elapsed % 5 === 0) save();
  }, 1000);

  function onBack() {
    if (ui.busy) { ui.genToken++; return hideBusy(); }
    if (ui.picker) { ui.picker = null; return renderModal(); }
    if (ui.modal) { ui.modal = null; return renderModal(); }
    if (ui.screen === 'game' && ui.hint) { ui.hint = null; return renderGame(); }
    if (ui.screen !== 'menu') return go(backTarget());
    if (PLATFORM) PLATFORM.exit();
  }
  if (PLATFORM) {
    PLATFORM.onBack(onBack);
    PLATFORM.onResume(() => { if (SYNC) SYNC.push(); });
  }
  if (SYNC) {
    SYNC.init({
      getLocal: localForSync,
      applyRemote,
      onState: () => {
        if (ui.screen === 'account' && !ui.accBusy) renderAccount();
        else if (ui.screen === 'menu' && !ui.busy) renderMenu();
      }
    });
  }

  render();
})();
