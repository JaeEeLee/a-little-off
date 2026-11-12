/* 도슨트 영어 모드: 작품별 영어 설명 (/docent, 영어일 때만)
 *
 * 작가들이 보내 준 작품 설명 PDF(작품 설명 · 크기 · 재료)를 영어로 옮긴 글이다. 음성은 한국어 그대로.
 * 작품을 고르면 그 작품 아래에 영어 설명이 펼쳐지고, 'Read aloud'를 누르면 휴대폰의 영어 음성으로 읽어 준다.
 * 키는 docent-tracks.js 의 name (작가 본명)
 */
(function () {
  'use strict';
  if (window.SITE_LANG !== 'en') return;

  var WORKS = {
    노정균: {
      meta: 'Oil on canvas · 116.8 × 91 cm',
      text: [
        '“…and make their eyes bright and eager with many a strange tale, perhaps even with the dream of Wonderland of long ago… remembering her own child-life, and the happy summer days.” (Alice’s Adventures in Wonderland)',
        'Each of us once had a dream of our own wonderland as a child. Some of us still carry that dream, while others, growing up and fitting into society and reality, slowly forget it.',
        'I can’t say that dream is always a good thing. But if the wonderlands we each had in our innocent days came together, I think our dry lives might fill with more colourful, brighter stories.'
      ]
    },
    배정연: {
      meta: 'Oil on canvas · 91 × 72.7 cm',
      text: [
        'As a child, I believed I could go anywhere and become anything. Now that I’m an adult, I sometimes waver at countless crossroads, shaken by reality, by the pace of those around me, and by the standards society sets.',
        'One day a letter arrived from me ten years ago. Am I living as the person I dreamed of being back then?',
        'The letter handed over by my younger self in the painting is a question from the past and a small greeting to the person I am now. The freely unfolding Wonderland and the signposts pointing in many directions contrast the possibilities of childhood with the dilemmas of choice I met as an adult.',
        'Perhaps becoming an adult doesn’t mean becoming someone who never wavers, but moving forward without letting go of what you love, even amid uncertainty.',
        'What kind of grown-up did you become?'
      ]
    },
    엄현서: {
      meta: 'Oil on canvas · 65.1 × 80.3 cm',
      text: [
        'When I was little, a pumpkin doll I saw was so creepy that I stopped eating pumpkin. But when I grow up, I really want to try pumpkin.',
        'If I could go to the “Wonderland” I imagine, I would go with Jaeeun and my big brother.',
        'In the painting, Jaeeun is a “mushroom” sending a distress signal asking for sausages, and my brother is a “turtle” who runs fast but thinks deeply and takes things slowly. And I have turned into a “sunflower” because I want to bring happiness to people.',
        'If you went to Wonderland, what would you want to become?'
      ]
    },
    이재이: {
      meta: 'Oil on panel · 80.3 × 116.8 cm',
      text: [
        'Inspired by Alice’s Adventures in Wonderland, this work portrays the inner world of someone who is unpracticed at making her own choices because she is busy watching how others look at her and react.',
        'In a chaotic, tangled world, Alice holds a chess piece in her hand but cannot decide where to place it. Instead she looks out at the viewer beyond the canvas, as if asking what her next move should be. It is the picture of someone who has kept putting her own voice aside while checking everyone around her.',
        'Yet the hand holding the chess piece is, in the end, Alice’s own. Even if it isn’t the right answer, even if it’s imperfect, the one who makes the next move has to be herself. I hope that after leaving this exhibition, each of us listens to our own voice more than to the eyes of others, and chooses the next move in our lives for ourselves.'
      ]
    },
    이희지: {
      meta: 'Oil on canvas · 162.2 × 112.1 cm',
      text: [
        'People with different values and ways of living are gathered around one table.',
        'Each figure is vividly present in their own colour, while the objects on the table have lost their colour and remain only as silhouettes. This questions the rules and standards of reality that we have taken for granted.',
        'There is no perfect person, and no single answer that applies to everyone. What matters is choosing to sit at one table together despite our differences.',
        'I am strange, and so are you.',
        'Now bring your strangeness and take a seat at this table with us.'
      ]
    },
    윤혜진: {
      meta: 'Digital drawing · 72.7 × 72.7 cm',
      text: [
        'Inspired by Alice’s Adventures in Wonderland, this work depicts the process of slowly stepping away from measuring yourself by the traces others leave behind.',
        'As Alice sits on a large open palm, the rabbit holding a watch passes by and leaves clear footprints. The rabbit has its own time and destination, and Alice has the place where she stays. Alice looks at the footprints and smiles. The hand she sits on is her own, open and holding on to nothing.',
        'Even if someone else’s path is clearly visible, it doesn’t have to be my direction. This is a heart that acknowledges others’ traces without losing its own place.'
      ]
    },
    박정은: {
      meta: 'Oil on canvas · 29.5 × 42 cm',
      text: [
        'Borrowing the world of Alice’s Adventures in Wonderland, this work expresses “the stages of life set by society, and a life lived at one’s own pace.”',
        'The spring, summer, autumn and winter hats that the Hatter hands over one after another symbolize the roles and tasks society demands at each stage of life. But Alice looks not at the next hat, but at a small bud just about to bloom. The bud stands for “the goal you truly want and the potential that has not yet blossomed.”',
        'Just as not every flower blooms in the same season, the work holds “the wish to move forward at your own pace, looking at what you want, even if you bloom a little late,” rather than fitting yourself to a set time.'
      ]
    },
    최윤지: {
      meta: 'Oil on canvas · 72.7 × 53 cm',
      text: [
        'As twins, we saw and felt so much together for a long time and walked the same path. At twenty we stood on different paths for the first time, and watching my sister move one step ahead, I suddenly wondered if I was the only one falling behind. Then I realized: our steps are simply different. No one is ahead and no one is behind. Everyone has their own path and pace.',
        'The painting holds the new beginnings we will each meet on our different paths, and the two of us facing that moment. Past the time when we looked at one cake together, we now light candles on our own cakes and celebrate and cheer each other’s new start. Like the candles on the cakes, I hope each of our futures will be lit warmly by our own light, and that this feeling reaches everyone walking their own path at their own pace.',
        'Whose pace are you walking at right now?'
      ]
    },
    최윤아: {
      meta: 'Oil on canvas · 65.2 × 91 cm · Off-beat: slightly off the set rhythm',
      text: [
        'Sometimes, even among people, I feel apart, unable to blend in naturally. In the painting, people drink tea and talk together, while I hide inside a teacup, spending time on my own.',
        'Like Alice dropped into a strange world, I too have moments when I suddenly feel like a stranger in my familiar reality. Perhaps even in the same space, we are each in different worlds?'
      ]
    },
    임소라: {
      meta: 'Pen on paper panel · 33.3 × 53 cm',
      text: [
        'I grew up believing in the myth of success. I believed a life only had meaning if I achieved something great. So whenever I slacked off even a little or failed to achieve something, I built myself a prison called a failed life, always whipping myself on and trying to erase the fear of “what if I fail?”',
        'But at some point, watching people do whatever it takes for worldly success, I began to ask what success really means, and slowly started to doubt the myth. Now that the belief I held has broken, I have to open a new door I have never gone through.',
        'As I hesitated in front of that door, I met Alice’s Adventures in Wonderland again, one of my favourite stories as a child. I don’t know what will happen, but I think I just have to step forward like Alice and jump into the unknown hole, waiting for the moment my self twenty years from now tells me: “See? It was nothing. Just do it. You’re so brave.”'
      ]
    },
    홍성호: {
      meta: 'Pen on paper · 20 × 20 cm each',
      text: [
        'The three teacups in this work trace a small journey toward finding my own choices. For someone used to following paths others set, choosing something for yourself is as difficult and careful as stepping into a strange world. At a crossroads I rarely choose for myself, and even when I make a good choice, I don’t know how to fully accept it as mine or be satisfied with it.',
        'The empty teacup stands for a self not yet decided, and for countless possibilities. Drawing patterns on it one by one means being filled with other people’s patterns rather than my own. The last teacup shows the moment I pour my own thoughts and experiences into the choices made that way.',
        'What it will hold and how it will taste, I don’t yet know. Perhaps it was a series of choices with no right answers, like the many crossroads Alice met in a strange world. This work is a small record of someone who lived inside others’ choices slowly discovering his own taste and direction, and finally beginning to make his own choices.',
        'Can the teacups I fill from now on hold a little more of who I am?'
      ]
    },
    남다름: {
      meta: 'Oil on canvas · 41 × 53 cm',
      text: [
        'In my teens and twenties, like young Alice, even when everything around me was full of absurd rules and contradictions, I chased the clock rabbit in front of me and bit into strange mushrooms without hesitation, with big dreams and courage in my heart. Every reckless moment was a new adventure, and even falling and getting lost was a dazzling joy in itself.',
        'Now in my thirties, I have finally reached the real world outside the garden. My steps, once running without a care, have grown more careful, weighed down by the heavy weight of reality, and I think about the burden of life that will hold up tomorrow before I think of curiosity. The joys that used to come as if by magic are gone; now I have to make time on purpose in a busy day and plan ahead to have a small, cosy “tea time” of my own.',
        'I may no longer follow the clock rabbit and leap into the rabbit hole on a whim, but Alice in her thirties knows this: small keys are still hidden in every corner of life, and there is a mirror that can take you anywhere. It’s just that instead of grand, noisy adventures, she now has the true ability to turn the small moments she carefully chooses and tends over time into real fantasy.'
      ]
    },
    남선주: {
      meta: 'Oil on canvas · 60.6 × 72.7 cm',
      text: [
        'As a child, I dreamed of freedom. But through control, family pain, and the grief of losing someone I loved, I lost my way many times. Each time, I asked, “Who am I?” Painting was a journey to meet the self I had lost.',
        'This is not a retelling of Alice’s Adventures in Wonderland. It holds the journey of one person passing through a strange, sometimes confusing world, searching for her own self and heart.',
        'In the end, the happiness I found was not far away. Being able to take one step in the direction I want: that was freedom for me.',
        'Today, too, I walk through my own wonderland, drawing myself as I go.'
      ]
    },
    박수룡: {
      meta: 'Acrylic and coloured pencil on panel · 60.6 × 72.7 cm · Footsteps on the Borderline',
      text: [
        'The small Alice in this work is “the self of true footsteps,” speaking for my deepest inner voice. The huge, imposing knights symbolize the social norms and others’ eyes around me, and the fear and anxiety within me. The hearts, spades, clubs and diamonds carved into their armour press down on me with their heavy bodies, like invisible chains.',
        'But the little child does not stop walking. Breaking through overwhelming restraint and threat, she presses on toward the small door of a journey, the only thing shining in the dark. For me that door is an escape to a wider world, and a hope toward new possibilities and dreams.',
        'The door may be small and the road ahead rough, but I am no longer trapped in my own darkness. I will face the knights’ heavy pressure with courage, break through, and never stop walking toward a world of my own.',
        'This is a small record of my will to overcome the fear deep inside me and move toward a wider world by my own strength. I hope my small footsteps will one day become a great echo toward that wider world.'
      ]
    },
    이경도: {
      meta: 'Oil on canvas · 80.3 × 100 cm',
      text: [
        'I think it’s important to look honestly at what I feel, like and want. Only when I’m alone, away from others’ eyes, can I discover raw emotions that were hidden, and I capture those moments and make them my own.',
        'The faceless figure in this painting stands for a self not yet defined. The dark garden is my inner world, and the many flowers blooming there are the different emotions I face. The dog beside me is another version of me, looking at that strange world together.',
        'Like Alice in Wonderland, I wander through the wonderland inside me and keep asking: Who am I? And what does the real me look like?'
      ]
    },
    편해연: {
      meta: 'Oil on canvas · 50 × 65.1 cm',
      text: [
        'The moment I step away from the busy pace the world demands and close the door, my room becomes a “wonderland” all my own. The sweet laziness I allow myself on a cosy bed, away from others’ eyes, is the deepest rest for a drained inner self.',
        'But this wonderland doesn’t mean cutting myself off from the world completely. The gaze in the canvas is open, not to the closed room, but to the world outside the wide window. It is closer to a wish to reconnect kindly with the world after fully enjoying my own quiet peace.',
        'The busy track of reality and the inner wish to be lazy: the work captures the process of finding my own temperature in a wonderland where these two opposite feelings cross pleasantly.'
      ]
    },
    이서현: {
      meta: 'Oil on canvas · 25 × 25 cm',
      text: [
        'Just as Alice sets off on an adventure into a strange world, I am preparing for a new journey by returning to art after a long pause. I am facing again the dream of painting I once drifted away from, and taking one step at a time toward a new goal.',
        'The hat and cards on the cake symbolize Alice’s mysterious world, and the burning candle stands for my dream lit again and a new beginning. Excitement and fear live side by side before an unfamiliar road, but just as Alice found her own way, I want to move toward my own wonderland.',
        'And I’d like to ask you, looking at this work: like the match lying in front of the cake, is there a dream in your heart you’d like to light again?'
      ]
    },
    조수연: {
      meta: 'Mixed media on canvas · 53 × 65.1 cm',
      text: [
        'Like Alice, who loses herself through endless transformations, we too live wearing an “instant persona” shaped by others’ expectations. While we mistake the showy flowers others have placed in us for our true selves, we lose our agency and become passive “vases” holding other people’s decorations.',
        'In the strange moment we suddenly become aware of this showy shell, left alone in Wonderland, we ask: what price must we pay to pour out all the flowers others forced into us and reclaim the real self inside?'
      ]
    },
    김지현: {
      meta: 'Pen drawing · 252 × 43 cm',
      text: [
        'This work began with the scene of a table after a tea party, when a long conversation is over. When we talk about life’s experiences and worries, conversations run long, and the table is left with half-finished tea and coffee, scattered plates and traces of food.',
        'The untidy table resembles our lives, which rarely offer easy answers and are never always neat. Even so, we sit together for a while, drink tea, listen to each other’s stories and share our complicated feelings.',
        'I hope this work lets you see that, even among the mess, the time and conversations we shared remain. In the end, what do we leave on the table in our lives?'
      ]
    },
    홍림: {
      meta: 'Pen on paper · 55 × 27 cm',
      text: [
        'Like a “river” that flows endlessly, holding past, present and future as one, this work began with the question of whether our lives, too, are completed only through constant change. In the painting, Alice’s past, her present self, and her future self all exist in one space. The times she wavered and wandered among choices and relationships flow, like Siddhartha’s river, into a single stream. The moments she was confused by a self grown strange, and the fragments of fear when she thought she was lost, were in fact precious signposts she had to pass to reach the whole “me.”',
        'Every self you have met along the way is, in the end, a part of you. When we embrace past regrets and future worries just as they are, we finally meet our true selves.',
        'Isn’t the very place you stand now the middle of a journey back to the real you?'
      ]
    }
  };

  var openEl = null;

  function render(t) {
    if (openEl) {
      openEl.remove();
      openEl = null;
    }
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (!t || !t.name || !WORKS[t.name] || !t.el) return;
    var w = WORKS[t.name];
    var box = document.createElement('article');
    box.className = 'en-text';
    var meta = document.createElement('p');
    meta.className = 'en-meta';
    meta.textContent = w.meta;
    box.appendChild(meta);
    w.text.forEach(function (para) {
      var p = document.createElement('p');
      p.textContent = para;
      box.appendChild(p);
    });
    if ('speechSynthesis' in window && window.SpeechSynthesisUtterance) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'en-read';
      btn.textContent = '▶ Read aloud in English';
      btn.addEventListener('click', function () {
        if (speechSynthesis.speaking) {
          speechSynthesis.cancel();
          btn.textContent = '▶ Read aloud in English';
          return;
        }
        var audio = document.getElementById('audio');
        if (audio && !audio.paused) audio.pause(); // 한국어 음성과 겹치지 않게
        var u = new SpeechSynthesisUtterance(w.text.join('\n\n'));
        u.lang = 'en-US';
        u.rate = 0.95;
        u.onend = u.onerror = function () {
          btn.textContent = '▶ Read aloud in English';
        };
        btn.textContent = '■ Stop reading';
        speechSynthesis.speak(u);
      });
      box.appendChild(btn);
    }
    t.el.parentNode.appendChild(box);
    openEl = box;
  }

  window.addEventListener('docent-track', function (e) {
    render(e.detail);
  });
  if (window.docentNow) render(window.docentNow);
})();
