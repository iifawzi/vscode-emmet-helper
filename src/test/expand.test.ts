import assert from 'assert';
import { Options, UserConfig } from 'emmet';
import { describe, it } from 'mocha';
import { TextDocument, TextEdit } from 'vscode-languageserver-textdocument';
import { Position } from 'vscode-languageserver-types'
import { doComplete, expandAbbreviation, getSyntaxType, VSCodeEmmetConfig } from '../emmetHelper';

const COMPLETE_OPTIONS = {
	preferences: {},
	showExpandedAbbreviation: 'always',
	showAbbreviationSuggestions: false,
	syntaxProfiles: {},
	variables: {}
}

function testExpandWithCompletion(syntax: string, abbrev: string, expanded: string, options?: VSCodeEmmetConfig) {
	it(`should expand ${abbrev} to\n${expanded}`, async () => {
		const document = TextDocument.create(`test://test/test.${syntax}`, syntax, 0, abbrev);
		const position = Position.create(0, abbrev.length);

		const completionList = doComplete(document, position, syntax, options ?? COMPLETE_OPTIONS);

		assert.ok(completionList && completionList.items, `completion list exists for ${abbrev}`);
		assert.ok(completionList.items.length > 0, `completion list is not empty for ${abbrev}`);

		assert.strictEqual(expanded, TextDocument.applyEdits(document, [<TextEdit>completionList.items[0].textEdit]));
	});
}

function testCountCompletions(syntax: string, abbrev: string, expectedNumCompletions: number) {
	it(`should expand ${abbrev} with ${expectedNumCompletions} completions`, async () => {
		const document = TextDocument.create(`test://test/test.${syntax}`, syntax, 0, abbrev);
		const position = Position.create(0, abbrev.length);

		const completionList = doComplete(document, position, syntax, COMPLETE_OPTIONS);

		if (expectedNumCompletions) {
			assert.ok(completionList && completionList.items, `completion list exists for ${abbrev}`);
			assert.strictEqual(completionList.items.length, expectedNumCompletions);
		} else {
			assert.strictEqual(completionList, undefined);
		}
	});
}

function testExpand(syntax: string, abbrev: string, expanded: string, options?: Partial<Options>) {
	it(`should expand ${abbrev} to\n${expanded}`, async () => {
		const type = getSyntaxType(syntax);
		const config: UserConfig = {
			type,
			syntax,
			options
		}
		const expandedRes = expandAbbreviation(abbrev, config);
		assert.strictEqual(expanded, expandedRes);
	});
}

function testWrap(abbrev: string, text: string | string[], expanded: string, options?: Partial<Options>, language: 'html' | 'jsx' = 'html') {
	it(`should wrap ${text} with ${abbrev} to obtain\n${expanded}`, async () => {
		const syntax = language;
		const type = getSyntaxType(syntax);
		const config: UserConfig = {
			type,
			syntax,
			text,
			options
		};
		const expandedRes = expandAbbreviation(abbrev, config);
		assert.strictEqual(expanded, expandedRes);
	});
}

describe('Expand Abbreviations', () => {
	testExpandWithCompletion('html', 'ul>li', '<ul>\n\t<li>${0}</li>\n</ul>');

	// https://github.com/microsoft/vscode/issues/59951
	testExpandWithCompletion('scss', 'fsz18', 'font-size: 18px;');

	// https://github.com/microsoft/vscode/issues/63703
	testExpandWithCompletion('jsx', 'button[onClick={props.onClick}]', '<button onClick={props.onClick}>${0}</button>');

	// https://github.com/microsoft/vscode/issues/65464
	testExpand('css', 'bd1#s', 'border: 1px #000 solid;');

	// https://github.com/microsoft/vscode/issues/65904
	testExpand('html', '(div>div.aaa{$}+div.bbb{$})*2', '<div>\n\t<div class="aaa">1</div>\n\t<div class="bbb">1</div>\n</div>\n<div>\n\t<div class="aaa">2</div>\n\t<div class="bbb">2</div>\n</div>')

	// https://github.com/microsoft/vscode/issues/67971
	testExpandWithCompletion('html', 'div>p+lorem3', '<div>\n\t<p>${0}</p>\n\tLorem, ipsum dolor.\n</div>');

	// https://github.com/microsoft/vscode/issues/69168
	testExpandWithCompletion('html', 'ul>li{my list $@-}*3', '<ul>\n\t<li>my list 3</li>\n\t<li>my list 2</li>\n\t<li>my list 1</li>\n</ul>');

	// https://github.com/microsoft/vscode/issues/72594
	testExpand('css', 'c#1', 'color: #111;', { "stylesheet.shortHex": true });
	testExpand('css', 'c#1', 'color: #111111;', { "stylesheet.shortHex": false });

	// https://github.com/microsoft/vscode/issues/74505
	testExpandWithCompletion('css', '@f', '@font-face {\n\tfont-family: ${1};\n\tsrc: url(${0});\n}');
	testExpandWithCompletion('css', '@i', '@import url(${0});');
	testExpandWithCompletion('css', '@import', '@import url(${0});');
	testExpandWithCompletion('css', '@kf', '@keyframes ${1:identifier} {\n\t${0}\n}');
	testExpandWithCompletion('css', '@', '@media ${1:screen} {\n\t${0}\n}');
	testExpandWithCompletion('css', '@m', '@media ${1:screen} {\n\t${0}\n}');

	// https://github.com/microsoft/vscode/issues/84608
	// testExpandWithCompletion('css', 'bg:n', 'background: none;');

	// https://github.com/microsoft/vscode/issues/92120
	testExpandWithCompletion('css', 'd', 'display: ${1:block};');

	// https://github.com/microsoft/vscode/issues/92231
	testExpandWithCompletion('html', 'div[role=tab]>(div>div)+div', '<div role="tab">\n\t<div>\n\t\t<div>${1}</div>\n\t</div>\n\t<div>${0}</div>\n</div>');

	// https://github.com/microsoft/vscode/issues/105697
	testExpandWithCompletion('css', 'opa.', 'opacity: .;');
	testExpandWithCompletion('css', 'opa.1', 'opacity: 0.1;');
	testExpandWithCompletion('css', 'opa1', 'opacity: 1;');
	testExpandWithCompletion('css', 'opa.a', 'opacity: .a;');

	// https://github.com/microsoft/vscode/issues/114923
	testExpandWithCompletion('html', 'figcaption', '<figcaption>${0}</figcaption>');

	// https://github.com/microsoft/vscode/issues/115623
	testCountCompletions('html', 'html', 1);
	testCountCompletions('html', 'body', 1);

	// https://github.com/microsoft/vscode/issues/115839
	testExpandWithCompletion('css', 'bgc', 'background-color: ${1:#fff};');
	testExpandWithCompletion('sass', 'bgc', 'background-color: ${1:#fff}');

	// https://github.com/microsoft/vscode/issues/115854
	testCountCompletions('sass', 'bkco', 0);
	testCountCompletions('sass', 'bgc', 1);

	// https://github.com/microsoft/vscode/issues/115946
	testExpandWithCompletion('html', '{test}*3', 'test\ntest\ntest');

	// https://github.com/microsoft/vscode/issues/117154
	testExpandWithCompletion('html', 'hgroup', '<hgroup>${0}</hgroup>');

	// https://github.com/microsoft/vscode/issues/117648
	testExpandWithCompletion('css', 'gtc', 'grid-template-columns: repeat(${0});');
	testExpandWithCompletion('sass', 'gtc', 'grid-template-columns: repeat(${0})');

	// https://github.com/microsoft/vscode/issues/118363
	testCountCompletions('jsx', '{test}', 0);
	testCountCompletions('jsx', '{test}*2', 0);
	// this case shouldn't come up in everyday coding, but including it here for reference
	testExpandWithCompletion('jsx', 'import{test}*2', '<import>test</import>\n<import>test</import>');

	// https://github.com/microsoft/vscode/issues/119088
	testExpand('html', 'span*3', '<span></span><span></span><span></span>', { "output.inlineBreak": 0 });
	testExpand('html', 'span*3', '<span></span>\n<span></span>\n<span></span>', { "output.inlineBreak": 1 });

	// https://github.com/microsoft/vscode/issues/119937
	testExpandWithCompletion('html', 'div[a. b.]', '<div a b>${0}</div>', { "preferences": { "profile.allowCompactBoolean": true }});
	// testExpandWithCompletion('jsx', 'div[a. b.]', '<div a b>${0}</div>', { "preferences": { "profile.allowCompactBoolean": true }});
	testExpandWithCompletion('html', 'div[a. b.]', '<div a="a" b="b">${0}</div>', { "preferences": { "profile.allowCompactBoolean": false }});
	testExpandWithCompletion('jsx', 'div[a. b.]', '<div a="a" b="b">${0}</div>', { "preferences": { "profile.allowCompactBoolean": false }});

	// https://github.com/microsoft/vscode/issues/120356
	testExpandWithCompletion('jsx', 'MyComponent/', '<MyComponent />');
	testExpandWithCompletion('html', 'MyComponent/', '<MyComponent>');

	// https://github.com/microsoft/vscode/issues/120417
	testExpandWithCompletion('html', 'input', '<input type="${2:text}" />', { "preferences": { "output.selfClosingStyle": "xhtml" }});

	// https://github.com/microsoft/vscode/issues/124247
	testExpandWithCompletion('html', 'detai', '<details>${0}</details>');
	testExpandWithCompletion('html', 'summar', '<summary>${0}</summary>');

	// https://github.com/microsoft/vscode/issues/126780
	// testExpandWithCompletion('html', 'a[href=#]>p>a[href=#]', '<a href="#">\n\t<p><a href="#"></a></p>\n</a>');

	// https://github.com/microsoft/vscode/issues/127919
	// testExpandWithCompletion('html', 'div{{{test}}}', '<div>{{test}}</div>');

	// https://github.com/microsoft/vscode/issues/131966
	testExpandWithCompletion('html', 'span[onclick="alert();"]', '<span onclick="alert();">${0}</span>');
	testExpandWithCompletion('html', 'span[onclick="hi(1)(2);"]', '<span onclick="hi(1)(2);">${0}</span>');
	testExpandWithCompletion('html', 'span[onclick="hi;"]>(span)*2', '<span onclick="hi;"><span>${1}</span><span>${0}</span></span>');
	testExpandWithCompletion('html', '(span[onclick="hi;"]>span)*2', '<span onclick="hi;"><span>${1}</span></span><span onclick="hi;"><span>${0}</span></span>');

	// https://github.com/microsoft/vscode/issues/165933
	it(`should not mention X-UA-Compatible`, async () => {
		const type = getSyntaxType('html');
		const config: UserConfig = {
			type,
			syntax: 'html'
		}
		let expandedRes = expandAbbreviation('!', config);
		assert.ok(!expandedRes.includes('X-UA-Compatible'));
		expandedRes = expandAbbreviation('html:5', config);
		assert.ok(!expandedRes.includes('X-UA-Compatible'));
	});

	// https://github.com/microsoft/vscode/issues/137240
	// testExpandWithCompletion('css', 'dn!important', 'display: none !important;');

	// https://github.com/microsoft/vscode-emmet-helper/issues/37
	testExpandWithCompletion('xsl', 'cp/', '<xsl:copy select="${0}"/>');

	// https://github.com/microsoft/vscode-emmet-helper/issues/58
	testExpandWithCompletion('css', '!', '!important');
	testExpandWithCompletion('css', '!imp', '!important');
	testCountCompletions('css', '!importante', 0);

	// escaped dollar signs should not change after going through Emmet expansion only
	// VS Code automatically removes the backslashes after the expansion
	testExpand('html', 'span{\\$5}', '<span>\\$5</span>');
	testExpand('html', 'span{\\$hello}', '<span>\\$hello</span>');
	testExpand('html', 'ul>li.item$*2{test\\$}', '<ul>\n\t<li class="item1">test\\$</li>\n\t<li class="item2">test\\$</li>\n</ul>');

	// `output.reverseAttributes` emmet option
	testExpand('html', 'a.dropdown-item[href=#]{foo}', '<a href="#" class="dropdown-item">foo</a>', { "output.reverseAttributes": false });
	testExpand('html', 'a.dropdown-item[href=#]{foo}', '<a class="dropdown-item" href="#">foo</a>', { "output.reverseAttributes": true });
});

describe('Wrap Abbreviations (basic)', () => {
	// basic cases
	testWrap('ul>li', 'test', '<ul>\n\t<li>test</li>\n</ul>');
	testWrap('ul>li', ['test'], '<ul>\n\t<li>test</li>\n</ul>');
	testWrap('ul>li', ['test1', 'test2'], '<ul>\n\t<li>\n\t\ttest1\n\t\ttest2\n\t</li>\n</ul>');

	// dollar signs should be escaped when wrapped (specific to VS Code)
	testWrap('ul>li*', ['test$', 'test$'], '<ul>\n\t<li>test\\$</li>\n\t<li>test\\$</li>\n</ul>');
	testWrap('ul>li*', ['$1', '$2'], '<ul>\n\t<li>\\$1</li>\n\t<li>\\$2</li>\n</ul>');
	testWrap('ul>li.item$*', ['test$', 'test$'], '<ul>\n\t<li class="item1">test\\$</li>\n\t<li class="item2">test\\$</li>\n</ul>');

	// https://github.com/emmetio/expand-abbreviation/issues/17
	testWrap('ul', '<li>test1</li>\n<li>test2</li>', '<ul>\n\t<li>test1</li>\n\t<li>test2</li>\n</ul>');
});

describe('Wrap Abbreviations (with internal nodes)', () => {
	// wrapping elements where the internals contain nodes should result in proper indentation
	testWrap('ul', '<li>test</li>', '<ul>\n\t<li>test</li>\n</ul>');
	testWrap('ul', ['<li>test1</li>', '<li>test2</li>'], '<ul>\n\t<li>test1</li>\n\t<li>test2</li>\n</ul>');
	testWrap('ul>li', '<span>test</span>', '<ul>\n\t<li><span>test</span></li>\n</ul>');
	testWrap('ul>li', '<p>test</p>', '<ul>\n\t<li>\n\t\t<p>test</p>\n\t</li>\n</ul>');
	testWrap('ul>li>div', '<p><span>test</span></p>', '<ul>\n\t<li>\n\t\t<div>\n\t\t\t<p><span>test</span></p>\n\t\t</div>\n\t</li>\n</ul>');
	testWrap('ul*', ['<li>test1</li>', '<li>test2</li>'], '<ul>\n\t<li>test1</li>\n</ul>\n<ul>\n\t<li>test2</li>\n</ul>');
	testWrap('div', 'teststring', '<div>teststring</div>');
	testWrap('div', 'test\nstring', '<div>\n\ttest\n\tstring\n</div>');
});

describe('Wrap Abbreviations (more advanced)', () => {
	// https://github.com/microsoft/vscode/issues/45724
	testWrap('ul>li{hello}', 'Hello world', '<ul>\n\t<li>helloHello world</li>\n</ul>');
	testWrap('ul>li{hello}+li.bye', 'Hello world', '<ul>\n\t<li>hello</li>\n\t<li class="bye">Hello world</li>\n</ul>');

	// https://github.com/microsoft/vscode/issues/65469
	testWrap('p*', ['first line', '', 'second line'], '<p>first line</p>\n<p>second line</p>');
	testWrap('p', ['first line', '', 'second line'], '<p>\n\tfirst line\n\t\n\tsecond line\n</p>');

	// https://github.com/microsoft/vscode/issues/78015
	testWrap('ul>li*', ['one', 'two'], '<ul><li>one</li><li>two</li></ul>', { "output.format": false });

	// issue where wrapping with link was causing text nodes to repeat twice
	testExpand('html', 'a[href="https://example.com"]>div>b{test here}', '<a href="https://example.com">\n\t<div><b>test here</b></div>\n</a>');
	testExpand('html', 'a[href="https://example.com"]>div>p{test here}', '<a href="https://example.com">\n\t<div>\n\t\t<p>test here</p>\n\t</div>\n</a>');
	testWrap('a[href="https://example.com"]>div', '<b>test here</b>', '<a href="https://example.com">\n\t<div><b>test here</b></div>\n</a>');
	testWrap('a[href="https://example.com"]>div', '<p>test here</p>', '<a href="https://example.com">\n\t<div>\n\t\t<p>test here</p>\n\t</div>\n</a>');

	// these are technically supposed to collapse into a single line, but
	// as per 78015 we'll assert that this is the proper behaviour
	testWrap('h1', '<div><span>test</span></div>', '<h1>\n\t<div><span>test</span></div>\n</h1>', { 'output.format': false });
	testWrap('h1', '<div>\n\t<span>test</span>\n</div>', '<h1>\n\t<div>\n\t\t<span>test</span>\n\t</div>\n</h1>', { 'output.format': false });

	// https://github.com/microsoft/vscode/issues/54711
	// https://github.com/microsoft/vscode/issues/107592
	testWrap('a', 'www.google.it', '<a href="http://www.google.it">www.google.it</a>');
	testWrap('a', 'http://example.com', '<a href="http://example.com">http://example.com</a>');
	testWrap('a.link[test=here]', 'http://example.com', '<a href="http://example.com" class="link" test="here">http://example.com</a>');
	testWrap('a', 'http://www.site.com/en-us/download/details.aspx?id=12345', '<a href="http://www.site.com/en-us/download/details.aspx?id=12345">http://www.site.com/en-us/download/details.aspx?id=12345</a>');
	testWrap('a[href=]', 'test@example.com', '<a href="mailto:test@example.com">test@example.com</a>');

	// stranger cases involving elements within the a
	testWrap('a[href=http://example.com]>div', 'test',
		'<a href="http://example.com">\n\t<div>test</div>\n</a>');
	testWrap('a[href=http://example.com]>div', '<b>test</b>',
		'<a href="http://example.com">\n\t<div><b>test</b></div>\n</a>');
	testWrap('a[href=http://example.com]>div', '<p>test</p>',
		'<a href="http://example.com">\n\t<div>\n\t\t<p>test</p>\n\t</div>\n</a>');
	testWrap('a[href=http://example.com]>div', '<ul>\n\t<li>Hello world</li>\n</ul>',
		'<a href="http://example.com">\n\t<div>\n\t\t<ul>\n\t\t\t<li>Hello world</li>\n\t\t</ul>\n\t</div>\n</a>');

	// https://github.com/microsoft/vscode/issues/122231
	testWrap('div', '<img src={`img/projects/${src}`} alt=\'\' />',
		'<div><img src={`img/projects/${src}`} alt=\'\' /></div>', undefined, 'jsx');
});
