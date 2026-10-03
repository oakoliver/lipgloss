# Render: vhs assets/tapes/layout.tape (from the repo root)
Output assets/layout.gif

Set Shell bash
Set FontSize 14
Set Width 980
Set Height 1000
Set Padding 24
Set Theme "Catppuccin Mocha"
Set TypingSpeed 40ms

Hide
Type "export PS1='> ' && clear"
Enter
Show

Type "bun examples/layout.ts"
Sleep 400ms
Enter
Sleep 2.5s
