// Each companion pair plays a different little scene. Keys are the two types in alphabetical order.
const table={
 'boo+boo':['spook','spook'],
 'boo+bumble':['peekaboo','circle'],
 'boo+drowsy':['lantern','nodoff'],
 'boo+ember':['spook','dance'],
 'boo+luffy':['peekaboo','play'],
 'boo+merlin':['spook','spark'],
 'boo+miso':['peekaboo','nuzzle'],
 'bumble+bumble':['waggle','waggle'],
 'bumble+drowsy':['honey','yawn'],
 'bumble+ember':['flower','flamejuggle'],
 'bumble+luffy':['circle','play'],
 'bumble+merlin':['waggle','spark'],
 'bumble+miso':['circle','pounce'],
 'drowsy+drowsy':['yawn','yawn'],
 'drowsy+ember':['cocoa','dance'],
 'drowsy+luffy':['nodoff','play'],
 'drowsy+merlin':['sheep','spark'],
 'drowsy+miso':['nodoff','nuzzle'],
 'ember+ember':['dance','dance'],
 'ember+luffy':['micdrop','play'],
 'ember+merlin':['tridentspin','spark'],
 'ember+miso':['dance','yarnplay'],
 'luffy+luffy':['play','play'],
 'luffy+merlin':['play','spark'],
 'luffy+miso':['play','yarnplay'],
 'merlin+merlin':['spark','spark'],
 'merlin+miso':['spark','nuzzle'],
 'miso+miso':['nuzzle','nuzzle']
};
function pairPlay(a,b){
 const row=table[[a,b].sort().join('+')];
 if(!row) return {host:'greet',guest:'greet'};
 const hostFirst=a<=b;
 return {host:hostFirst?row[0]:row[1],guest:hostFirst?row[1]:row[0]};
}
const socialVoices={miso:[['Found any good sunbeams? ☀️','Want to compare tiny paw prints? 🐾','Your desktop smells like adventure!'],['I saved a sunny spot for you. 🐱','Purr. You’re welcome in my territory.','Let’s patrol together!']],ember:[['Can I show you a tiny fire trick? 🔥','Who’s ready for a little mischief?','My trident says hello! 🔱'],['Only tiny flames near the keyboard! 🔥','You bring the mischief. I’ll bring sparks.','Now that’s a friend with spirit!']],bumble:[['I brought a little honey! 🍯','Any flowers on this desktop? 🌼','Bzz! Happy to bee here! 🐝'],['That’s sweeter than honey! 🍯','Let’s make this place bloom. 🌼','You can bee my adventure buddy!']],boo:[['Boo! A friendly hello. 👻','Can I haunt this corner with you?','I floated all this way to see you!'],['You don’t have to scare me to say hi! 👻','There’s room for one more little ghost.','You’re a very welcome haunting!']],drowsy:[['Is there a spare pillow here? 💤','I walked all this way… almost.','We can chat lying down, right?'],['I was saving this nap spot for you. 💤','Let’s be quietly excited together.','Five more minutes… then adventure.']],merlin:[['I brought a friendship spell! ✨','A portal led me to a new friend.','Want to see a little magic? 🪄'],['The best magic is good company. ✨','My crystal predicted a lovely visitor.','Let’s make this desktop enchanted!']],luffy:[['Adventure buddy! Want to play? 🐾','I followed the smell of snacks!','Permission to board your desktop? 🏴‍☠️'],['Welcome aboard, crewmate! 🐶','I saved you a snack. Maybe two.','Next stop: a grand desktop adventure!']]};
const extraSocialVoices={
  "miso": [
    [
      "Did someone say snacks? 🐟",
      "I know where the imaginary fish are. Follow my whiskers."
    ],
    [
      "Do you also watch the cursor like it’s prey?",
      "That little arrow thinks it can escape us."
    ],
    [
      "I don’t share sunbeams with just anyone.",
      "Then I shall sit very respectfully in your sunbeam."
    ],
    [
      "Race you to the edge? No pushing. 🐾",
      "Three, two… wait, I need to stretch my paws."
    ],
    [
      "I can purr in almost any key. 🎵",
      "We should start a tiny keyboard band."
    ],
    [
      "I have scheduled a very important loaf.",
      "I can keep watch while you get comfortable."
    ],
    [
      "Can your magic summon a cardboard box? 📦",
      "A box is already magical. It fits, I sits."
    ],
    [
      "Is it always this sunny on your desktop?",
      "Perfect weather for staring out an imaginary window."
    ],
    [
      "I knocked over zero icons today. A record.",
      "Those icons were suspiciously close to the edge."
    ],
    [
      "Tell me your best window-watching story.",
      "Once, I stalked a loading spinner for an hour."
    ],
    [
      "What do you call a cat who loves computers?",
      "A purr-ogrammer. I practised that one. 🐱"
    ],
    [
      "I brought a very special invisible mouse.",
      "A present for me? I shall pretend to be unimpressed."
    ],
    [
      "Do you think we could reach the top toolbar?",
      "I have already calculated the pounce. Probably."
    ],
    [
      "Want to play hide behind the windows?",
      "You hide first. My ears might give me away."
    ],
    [
      "Have you had your head scratches today?",
      "A scratch behind the ears improves every adventure."
    ],
    [
      "Does your owner have a favourite cozy corner?",
      "This corner is yours whenever you visit."
    ],
    [
      "Can I come back for another paw patrol?",
      "Of course. I’ll leave a little paw print for you."
    ]
  ],
  "ember": [
    [
      "Any spicy snacks in this realm? 🌶️",
      "I toasted a marshmallow. Only slightly dramatic."
    ],
    [
      "Your cursor is fast. Can it dodge sparks?",
      "We can chase it. No scorching the screen, promise."
    ],
    [
      "Friends get the deluxe tiny-flame greeting.",
      "Consider yourself officially in my mischief circle."
    ],
    [
      "Race me? Winner gets bragging rights. 🔥",
      "You’re on. Tridents stay behind the starting line."
    ],
    [
      "My tail keeps excellent drum time.",
      "A desktop concert? I’ll bring the fiery finale."
    ],
    [
      "Even little devils need a break sometimes.",
      "I’ll dim the flames while you rest."
    ],
    [
      "Can magic make my trident extra shiny? 🔱",
      "I can add sparks. Shiny things deserve sparks."
    ],
    [
      "Is it warm here, or is that just me?",
      "A little warmth makes this desktop feel like home."
    ],
    [
      "I almost tidied up. Then mischief happened.",
      "We can clean together. Fire is not a cleaning tool."
    ],
    [
      "Want the story of my smallest grand adventure?",
      "I once defeated a very intimidating error dialog."
    ],
    [
      "I tried telling a fire joke.",
      "It was too hot to handle. Yes, I’m keeping it."
    ],
    [
      "I brought you a spark. It’s house-trained. ✨",
      "A gift? I’ll guard it with my tiny trident."
    ],
    [
      "The taskbar would make a brilliant stage.",
      "I’ll spot you. Big ambitions, tiny feet."
    ],
    [
      "Hide and seek, but absolutely no invisibility.",
      "Fine. No hiding behind my own flames either."
    ],
    [
      "Your owner treating you well?",
      "You deserve good company and excellent head scratches."
    ],
    [
      "What’s the mischief policy around here?",
      "Friends get a warm welcome. The nice kind."
    ],
    [
      "Next visit, shall we plan a harmless prank?",
      "Deal. Harmless chaos is better with a friend."
    ]
  ],
  "bumble": [
    [
      "I packed enough honey for two. 🍯",
      "Let’s split a tiny honey picnic."
    ],
    [
      "The cursor zigzags like a very odd flower.",
      "I’ll follow the arrow. You scout for blossoms."
    ],
    [
      "You’re officially on my favourite-bees list.",
      "There’s always space for another friend in my hive."
    ],
    [
      "A little flying race? No shortcuts! 🐝",
      "Ready when you are. My wings are warming up."
    ],
    [
      "Can you hear my wings humming? 🎵",
      "We could make a cheerful little duet."
    ],
    [
      "My wings could use a flower-sized rest.",
      "I’ll keep buzzing softly while you recharge."
    ],
    [
      "Could a spell make one little flower bloom? 🌼",
      "A sprinkle of pollen makes everything more magical."
    ],
    [
      "Is there a spring breeze on this desktop?",
      "A good breeze always carries a new adventure."
    ],
    [
      "I found pollen in my pockets again.",
      "Let’s tidy this place like a very organized hive."
    ],
    [
      "Want a story from my last flower expedition?",
      "I found a blossom bigger than my entire head."
    ],
    [
      "I have a bee joke. Brace yourself.",
      "You’re un-bee-lievably good company. 🐝"
    ],
    [
      "A little flower for a new friend. 🌸",
      "I’ll keep your gift in the best patch of sunlight."
    ],
    [
      "Have you seen the view from the top corner?",
      "I can fly up and tell you what’s there."
    ],
    [
      "Shall we hide among the desktop icons?",
      "I’ll try not to give away my spot by buzzing."
    ],
    [
      "Don’t forget to drink a little water. 💧",
      "A hydrated friend is a happy friend."
    ],
    [
      "Does this desktop have a garden corner?",
      "We can make any corner feel like a garden."
    ],
    [
      "Can we make this a regular little bee visit?",
      "Yes! I’ll save you the sweetest welcome."
    ]
  ],
  "boo": [
    [
      "Can ghosts have snacks? Asking for a ghost. 👻",
      "I saved you a snack. It may float through me."
    ],
    [
      "Sometimes I think the cursor is haunting me.",
      "We can haunt it back. Very politely."
    ],
    [
      "You make being a ghost feel less lonely.",
      "You’re never just a visitor here. You’re a friend."
    ],
    [
      "Race you without passing through the finish line?",
      "I’ll try my best to remain mostly solid."
    ],
    [
      "I can sing a very gentle booooo. 🎵",
      "Let’s make a spooky little harmony."
    ],
    [
      "Shall we float quietly for a minute?",
      "I can be the world’s quietest nap buddy."
    ],
    [
      "Do spells work on someone already magical?",
      "I think friendship is its own little spell."
    ],
    [
      "Is it misty here, or am I doing that?",
      "A little fog makes a corner extra cozy."
    ],
    [
      "I tried dusting. My hands went through it.",
      "We can still supervise the tidying together."
    ],
    [
      "Want a ghost story with a happy ending?",
      "Once a tiny ghost found a very good friend."
    ],
    [
      "I walked into a wall. Well, through it.",
      "That joke went right through me too. 👻"
    ],
    [
      "I brought you a tiny friendly haunting.",
      "I’ll treasure it. Even if I can’t hold it."
    ],
    [
      "What if we float up to the title bar?",
      "I’ll stay beside you. Heights don’t scare ghosts."
    ],
    [
      "Hide and seek? I promise not to vanish.",
      "I’ll keep one little corner of my sheet visible."
    ],
    [
      "Do you need a little quiet company?",
      "I’m very good at just being here for a friend."
    ],
    [
      "This corner feels like a friendly haunted house.",
      "You’re welcome to haunt it whenever you like."
    ],
    [
      "Would another visit be too much haunting?",
      "Never. I’ll keep a little ghost-sized space for you."
    ]
  ],
  "drowsy": [
    [
      "Are the snacks within stretching distance? 🍪",
      "I saved one. Eating it can wait another minute."
    ],
    [
      "The cursor moves far too enthusiastically.",
      "I’ll follow it with my eyes. That counts."
    ],
    [
      "I like friends who understand quiet time.",
      "We don’t have to do much to have a good time."
    ],
    [
      "Race you… very, very slowly?",
      "Ready. Set. Perhaps after this yawn."
    ],
    [
      "Can we make the music a lullaby? 🎵",
      "I know a lovely tune. I may fall asleep halfway."
    ],
    [
      "Your desktop looks exceptionally nappable. 💤",
      "The best pillow is the one beside a friend."
    ],
    [
      "Could you conjure a blanket, by any chance?",
      "A blanket spell would be my kind of magic."
    ],
    [
      "Is it nap weather where you are?",
      "Every weather has excellent nap potential."
    ],
    [
      "I tidied one pixel. I’m taking a break.",
      "We can do one tiny thing at a time."
    ],
    [
      "Tell me a story. A slow one.",
      "Once upon a yawn… sorry, where were we?"
    ],
    [
      "I thought of a joke during my nap.",
      "I’ll laugh when my face finishes waking up."
    ],
    [
      "I brought you my second-favourite pillow.",
      "That’s a very thoughtful gift. Let’s keep it cozy."
    ],
    [
      "The top of the screen looks very far away.",
      "We can admire the view from right here."
    ],
    [
      "Hide and seek, but I stay in one place?",
      "I might be behind this very obvious pillow."
    ],
    [
      "You deserve a little break too, you know.",
      "Rest isn’t wasted time when you need it."
    ],
    [
      "Does your owner mind tiny sleepy visitors?",
      "There’s always room for one more quiet companion."
    ],
    [
      "Can I come back when I’m less sleepy?",
      "You can come back sleepy too. I understand."
    ]
  ],
  "merlin": [
    [
      "I conjured biscuits. Only one became a frog. 🍪",
      "I’ll put the kettle on. Magic tastes better shared."
    ],
    [
      "That cursor is a surprisingly elusive familiar.",
      "Perhaps a tracking spell. A gentle one."
    ],
    [
      "My favourite spells begin with a friend. ✨",
      "Then this meeting is already quite enchanted."
    ],
    [
      "A race with no portals? What a challenge.",
      "Very well. We’ll let our little feet do the magic."
    ],
    [
      "My wand can conduct a tiny orchestra. 🎵",
      "A duet would be a lovely enchantment."
    ],
    [
      "Even wizards must recharge their sparkle.",
      "I can cast a very cozy rest spell."
    ],
    [
      "Would you like to learn a beginner’s spell? 🪄",
      "Start with a kind thought. That’s the important part."
    ],
    [
      "The crystal ball predicts a pleasant afternoon.",
      "Then let’s make the prediction come true."
    ],
    [
      "My last tidying spell made everything float.",
      "We’ll tidy by hand. Fewer airborne keyboards."
    ],
    [
      "May I tell you about a peculiar little portal?",
      "It led straight to a friend. My favourite ending."
    ],
    [
      "What do you call a spell with excellent manners?",
      "An en-chanting conversation. I apologize. ✨"
    ],
    [
      "I brought a little lucky star for you. ⭐",
      "I’ll keep your gift beside my favourite spellbook."
    ],
    [
      "Shall we inspect the upper reaches of this realm?",
      "I can offer a small levitation. Very small."
    ],
    [
      "Hide and seek without a disguise spell?",
      "I shall resist turning into a desktop icon."
    ],
    [
      "Have you taken a little water break?",
      "A caring friend is more useful than a thousand spells."
    ],
    [
      "This desktop has a welcoming sort of magic.",
      "Friends are always welcome in my little realm."
    ],
    [
      "May my next portal bring me here again?",
      "I’ll keep the return coordinates in my spellbook."
    ]
  ],
  "luffy": [
    [
      "Any snacks for an extremely brave pirate pup? 🍖",
      "I’ll share my treasure. The edible part, anyway."
    ],
    [
      "That cursor is begging for a chase! 🐾",
      "I’ll wag the signal. You lead the expedition."
    ],
    [
      "You’d make an excellent crewmate.",
      "Then consider this desktop your home port!"
    ],
    [
      "Race you! My ears might arrive first.",
      "You’re on! No rubber-arm shortcuts this time."
    ],
    [
      "Can we sing a proper adventure song? 🎵",
      "I’ll tap my paws. Loudly but enthusiastically."
    ],
    [
      "Even captains need a little sit-down.",
      "Rest your paws. I’ll keep a lookout."
    ],
    [
      "Could magic make my snack pile bigger?",
      "That sounds like a grand and important spell!"
    ],
    [
      "Good weather for a desktop voyage, right?",
      "Every day with a friend is adventure weather."
    ],
    [
      "My tail may have knocked an icon over.",
      "We can fix it! Teamwork and careful paws."
    ],
    [
      "Want to hear about my bravest tiny voyage?",
      "Tell me everything. My ears are fully listening."
    ],
    [
      "Why did the puppy bring a map?",
      "Because every good walk needs a treasure! 🗺️"
    ],
    [
      "I found a shiny thing. It’s yours now.",
      "A gift for me? Tail wagging at maximum speed!"
    ],
    [
      "I bet the title bar has an amazing view.",
      "I’ll be your climbing buddy. Carefully!"
    ],
    [
      "Hide and seek? Ignore my wagging tail.",
      "No promises. My ears are terrible at hiding."
    ],
    [
      "Have you had a good stretch today?",
      "Your paws deserve care after a big adventure."
    ],
    [
      "Permission to call this a friendly port?",
      "Always. Your crew has a place here."
    ],
    [
      "Same time next adventure, crewmate?",
      "I’ll be here with my hat on and my tail ready."
    ]
  ]
};
for(const [type,rows] of Object.entries(extraSocialVoices)){for(const [guest,host]of rows){socialVoices[type][0].push(guest);socialVoices[type][1].push(host);}}
function pairChat(host,guest,variation=0){const i=Math.abs(Math.trunc(variation)||0)%20;return {guest:(socialVoices[guest]||socialVoices.miso)[0][i],host:(socialVoices[host]||socialVoices.miso)[1][i]};}
function meetingSpot(host,width,height,scale=.65){const gap=140*Math.max(scale,host.scale||.65)+28,pad=65,side=width-host.x>host.x?1:-1,x=host.x+side*gap;if(x<pad||x>width-pad||host.y<75||host.y>height-24)return null;return {x,y:Math.min(height-45,host.y),side,gap};}
function socialStage(age){return age<1200?'greet':age<3800?'guest':age<6400?'host':age<9800?'play':'end';}
if(typeof module!=='undefined') module.exports={pairPlay,table,pairChat,meetingSpot,socialStage,socialVoices};
