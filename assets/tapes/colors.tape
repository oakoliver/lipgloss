# Render: vhs assets/tapes/colors.tape (from the repo root)
Set Shell bash
Set FontSize 16
Set Width 840
Set Height 520
Set Padding 24
Set Theme "Catppuccin Mocha"
Set TypingSpeed 40ms

Hide
Type "export PS1='> ' && clear"
Enter
Show

Type "bun examples/colors.ts"
Enter
Sleep 1.5s
Screenshot assets/colors.png
