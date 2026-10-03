# Render: vhs assets/tapes/joins.tape (from the repo root)
Set Shell bash
Set FontSize 16
Set Width 1100
Set Height 610
Set Padding 24
Set Theme "Catppuccin Mocha"
Set TypingSpeed 40ms

Hide
Type "export PS1='> ' && clear"
Enter
Show

Type "bun examples/joins.ts"
Enter
Sleep 1.5s
Screenshot assets/joins.png
