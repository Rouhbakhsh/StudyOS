import json
import os

unit_data = {
    "authored": 1,
    "book": "OWS-EL",
    "unit": "1",
    "title": [{"t": "Classroom vocabulary"}],
    "pages": [12],
    "sections": [
        {
            "label": "A",
            "title": "In the Classroom",
            "blocks": [
                {
                    "k": "cols",
                    "w": [5, 5],
                    "cols": [
                        [
                            {
                                "k": "table",
                                "head": 1,
                                "rows": [
                                    [[{"t": "#", "b": 1}], [{"t": "Word", "b": 1}], [{"t": "Notes / Meaning"}]],
                                    [[{"t": "1"}], [{"t": "whiteboard", "b": 1}], [{"t": "also called a board"}]],
                                    [[{"t": "2"}], [{"t": "board pen", "b": 1}], [{"t": "marker for the board"}]],
                                    [[{"t": "3"}], [{"t": "noticeboard", "b": 1}], [{"t": "board for notices"}]],
                                    [[{"t": "4"}], [{"t": "notice", "b": 1}], [{"t": "written announcement"}]],
                                    [[{"t": "5"}], [{"t": "desk", "b": 1}], [{"t": "table for working at"}]],
                                    [[{"t": "6"}], [{"t": "chair", "b": 1}], [{"t": "seat with a back"}]],
                                    [[{"t": "7"}], [{"t": "bag", "b": 1}], [{"t": "container for books"}]],
                                    [[{"t": "8"}], [{"t": "pen", "b": 1}], [{"t": "writes in ink"}]],
                                    [[{"t": "9"}], [{"t": "coursebook", "b": 1}], [{"t": "student textbook"}]],
                                    [[{"t": "10"}], [{"t": "pencil", "b": 1}], [{"t": "writes in graphite"}]],
                                    [[{"t": "11"}], [{"t": "table", "b": 1}], [{"t": "furniture with flat top"}]],
                                    [[{"t": "12"}], [{"t": "dictionary", "b": 1}], [{"t": "book of word definitions"}]],
                                    [[{"t": "13"}], [{"t": "CD", "b": 1}], [{"t": "compact audio disc"}]],
                                    [[{"t": "14"}], [{"t": "CD player", "b": 1}], [{"t": "machine to play audio CDs"}]],
                                    [[{"t": "15"}], [{"t": "piece of paper", "b": 1}], [{"t": "single sheet of paper"}]],
                                    [[{"t": "16"}], [{"t": "exercise book / notebook", "b": 1}], [{"t": "book for notes/exercises"}]]
                                ]
                            }
                        ],
                        [
                            {
                                "k": "fig",
                                "src": "books/ows-el/img/1-1.jpg",
                                "w": 630,
                                "h": 550,
                                "side": "full"
                            }
                        ]
                    ]
                }
            ]
        }
    ],
    "seeAlso": [],
    "exercises": [
        {
            "id": "1.1",
            "instruction": [
                {"t": "Tick (", "b": 1},
                {"t": "✓", "b": 1, "c": "#15803D"},
                {"t": ") the things you can put in a bag. Put a cross (", "b": 1},
                {"t": "✗", "b": 1, "c": "#B91C1C"},
                {"t": ") by the things you can't.", "b": 1}
            ],
            "blocks": [
                {
                    "k": "p",
                    "lines": [
                        [{"t": "Example: ▶ pen: "}, {"t": "✓", "b": 1, "c": "#15803D"}, {"t": "  |  ▶ board: "}, {"t": "✗", "b": 1, "c": "#B91C1C"}]
                    ]
                },
                {
                    "k": "items",
                    "items": [
                        {"n": "1", "parts": [{"t": "pencil  "}, {"choice": ["✓", "✗"], "ans": [0]}]},
                        {"n": "2", "parts": [{"t": "desk  "}, {"choice": ["✓", "✗"], "ans": [1]}]},
                        {"n": "3", "parts": [{"t": "notice  "}, {"choice": ["✓", "✗"], "ans": [0]}]},
                        {"n": "4", "parts": [{"t": "CD player  "}, {"choice": ["✓", "✗"], "ans": [0]}]},
                        {"n": "5", "parts": [{"t": "table  "}, {"choice": ["✓", "✗"], "ans": [1]}]},
                        {"n": "6", "parts": [{"t": "coursebook  "}, {"choice": ["✓", "✗"], "ans": [0]}]},
                        {"n": "7", "parts": [{"t": "chair  "}, {"choice": ["✓", "✗"], "ans": [1]}]},
                        {"n": "8", "parts": [{"t": "noticeboard  "}, {"choice": ["✓", "✗"], "ans": [1]}]},
                        {"n": "9", "parts": [{"t": "dictionary  "}, {"choice": ["✓", "✗"], "ans": [0]}]},
                        {"n": "10", "parts": [{"t": "piece of paper  "}, {"choice": ["✓", "✗"], "ans": [0]}]}
                    ]
                }
            ],
            "key": {
                "1": "✓",
                "2": "✗",
                "3": "✓",
                "4": "✓",
                "5": "✗",
                "6": "✓",
                "7": "✗",
                "8": "✗",
                "9": "✓",
                "10": "✓"
            }
        },
        {
            "id": "1.2",
            "instruction": [{"t": "Complete the words or phrases.", "b": 1}],
            "blocks": [
                {
                    "k": "p",
                    "lines": [
                        [{"t": "Example: ▶ note + book = "}, {"t": "notebook", "b": 1, "c": "#312E81"}]
                    ]
                },
                {
                    "k": "items",
                    "items": [
                        {"n": "1", "parts": [{"t": "board "}, {"gap": 1, "w": 80}]},
                        {"n": "2", "parts": [{"t": "course"}, {"gap": 1, "w": 80}]},
                        {"n": "3", "parts": [{"t": "notice"}, {"gap": 1, "w": 80}]},
                        {"n": "4", "parts": [{"t": "exercise "}, {"gap": 1, "w": 80}]},
                        {"n": "5", "parts": [{"t": "piece of "}, {"gap": 1, "w": 80}]},
                        {"n": "6", "parts": [{"t": "CD "}, {"gap": 1, "w": 80}]}
                    ]
                }
            ],
            "key": {
                "1": "pen",
                "2": "book",
                "3": "board",
                "4": "book",
                "5": "paper",
                "6": "player"
            }
        },
        {
            "id": "1.3",
            "instruction": [{"t": "Write your answers (name the classroom item).", "b": 1}],
            "blocks": [
                {
                    "k": "p",
                    "lines": [
                        [{"t": "Example: ▶ You sit on one of these. ➔ "}, {"t": "a chair", "b": 1, "c": "#312E81"}]
                    ]
                },
                {
                    "k": "items",
                    "items": [
                        {"n": "1", "parts": [{"t": "The teacher writes on this. ➔ "}, {"gap": 1, "w": 180}]},
                        {"n": "2", "parts": [{"t": "You find the meaning of words in this. ➔ "}, {"gap": 1, "w": 180}]},
                        {"n": "3", "parts": [{"t": "You sit behind one of these. ➔ "}, {"gap": 1, "w": 180}]},
                        {"n": "4", "parts": [{"t": "You write in one of these. ➔ "}, {"gap": 1, "w": 180}]},
                        {"n": "5", "parts": [{"t": "The teacher puts information on this. ➔ "}, {"gap": 1, "w": 180}]},
                        {"n": "6", "parts": [{"t": "The teacher can play one of these. ➔ "}, {"gap": 1, "w": 180}]},
                        {"n": "7", "parts": [{"t": "You can put your books in this. ➔ "}, {"gap": 1, "w": 180}]},
                        {"n": "8", "parts": [{"t": "You study from one of these. ➔ "}, {"gap": 1, "w": 180}]}
                    ]
                }
            ],
            "key": {
                "1": "a whiteboard",
                "2": "a dictionary",
                "3": "a desk",
                "4": "a notebook",
                "5": "a noticeboard",
                "6": "a CD",
                "7": "a bag",
                "8": "a coursebook"
            }
        },
        {
            "id": "1.4",
            "instruction": [{"t": "ABOUT YOU: Write things you have got at home, and things you haven't got.", "b": 1}],
            "blocks": [
                {
                    "k": "p",
                    "lines": [
                        [{"t": "Example: ▶ I've got a dictionary. / I haven't got a CD player."}]
                    ]
                },
                {
                    "k": "items",
                    "items": [
                        {"n": "1", "parts": [{"t": "I've got "}, {"gap": 1, "w": 200, "free": 1}]},
                        {"n": "2", "parts": [{"t": "I haven't got "}, {"gap": 1, "w": 200, "free": 1}]}
                    ]
                }
            ],
            "key": {
                "1": "a dictionary",
                "2": "a noticeboard"
            }
        }
    ]
}

target_path = r"F:\v2\public\books\ows-el\units\1.json"
with open(target_path, "w", encoding="utf-8") as f:
    json.dump(unit_data, f, ensure_ascii=False, indent=2)

print(f"[✓] Saved pristine Unit 1 JSON to {target_path}")
