# BarneBrøk

Et lite, visuelt program som lar barn i alderen 2–4 år leke inn det brøk bygger på:
at en hel kan deles i like store biter, at bitene kan settes sammen igjen, og at
deling skal være rettferdig.

## Prototype 1: hel og halv

Ett eple (så appelsin, så kake), to sultne venner: bamsen og kaninen.

1. Barnet trykker på maten. Den deles i to halve.
2. Barnet drar en bit til hver venn.
3. Får begge like mye, spiser de, og det blir fest.
4. Neste mat kommer inn som to halve som glir sammen til en hel.

Gir barnet begge bitene til samme venn, blir den andre lei seg og biten spretter
tilbake. Det finnes ingen feil, bare nye forsøk.

Ingen tekst vises for barnet. Alt formidles med stemme, animasjon og lyd.
Spørsmålstegnet øverst til høyre åpner tips til den voksne.

## Kjøre

Åpne `index.html` i en nettleser, eller start en enkel server:

```
npx serve .
```

Stemmen bruker nettleserens talesyntese. Den krever at enheten har en norsk
stemme installert (iPad og Android har det som regel). Uten norsk stemme kjører
leken stille, med lydeffekter.

## Teknisk

Ren HTML, CSS og JavaScript uten avhengigheter. Grafikken er SVG tegnet i koden,
lydene er syntetisert med Web Audio. Dette gjør prototypen lett å teste på et
nettbrett og lett å bytte ut med innspilt stemme og tegnet grafikk senere.
