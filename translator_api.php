<?php

header("Cache-Control: max-age=2592000");
header("Expires: ".gmdate("D, d M Y H:i:s", time()+2592000)." GMT");

if (empty($_GET['callback'])) {
    http_response_code(404);
}

header("Content-Type: application/javascript");

class Trans
{
    public $code = 1;
    public $text = '';
    public $delimiter = '----------';
    public $pars_key = '';
    public $pars_data = [];
    public $pars_text = [];
    public $pars_trans_arr = [];

    /**
     * set translate text, set code, return int code
     *
     * @param string $text
     * @return int code
     */
    public function translate($text)
    {
        if (trim($text) == '') {
            $this->code = 0;
            $this->text = $text;
            return $this->code;
        }
        $this->code = 1;
        $this->text = '';
        file_exists(__DIR__ . '/data') or mkdir(__DIR__ . '/data') or exit('data dir not exists');
        $tmpfname = tempnam(__DIR__ . '/data', 'trans-');
        if ($tmpfname) {
            $file = new SplFileObject($tmpfname, 'wb');
            $file->flock(LOCK_EX);
            $file->fwrite($text);
            $file->flock(LOCK_UN);
            $out = [];
            exec('cat ' . $tmpfname . ' | trans 2>/dev/null', $out, $this->code);
            if ($this->code == 0) {
                $this->text = implode("\n", $out);
            }
            unlink($tmpfname);
        }

        return $this->code;
    }

    public function pars($text, $key = 'key')
    {
        $this->pars_key = $key;
        $text = preg_replace_callback('#>([^<>]+)<#is', function ($matches) {
            if (trim($matches[1])) {
                return '> ' . $this->add_pars_data($matches[1], $this->pars_key) . ' <';
            }
            return $matches[0];
        }, $text);

        $text = preg_replace_callback('#>([^<>]+)$#is', function ($matches) {
            if (trim($matches[1])) {
                return '> ' . $this->add_pars_data($matches[1], $this->pars_key);
            }
            return $matches[0];
        }, $text);

        $text = preg_replace_callback('#^([^<>]+)<#is', function ($matches) {
            if (trim($matches[1])) {
                return $this->add_pars_data($matches[1], $this->pars_key) . ' <';
            }
            return $matches[0];
        }, $text);

        $text = preg_replace_callback('#^([^<>]+)$#is', function ($matches) {
            if (trim($matches[1])) {
                return $this->add_pars_data($matches[1], $this->pars_key);
            }
            return $matches[0];
        }, $text);

        $this->pars_text[$key] = $text;
    }

    public function add_pars_data($text, $key)
    {
        $text = preg_replace('#[-]{5,}#', ' ', $text);
        $this->pars_data[] = $text;
        return '{/%-{' . $key . '-' . (count($this->pars_data) - 1) . '}-%/}';
    }

    public function translate_pars(&$extracts)
    {
        if (!$this->pars_data) {
            return 1;
        }
        $data = implode("\r\n" . $this->delimiter . "\r\n", $this->pars_data);
        if ($this->translate($data) === 0 && ($this->pars_trans_arr = explode($this->delimiter, $this->text)) && count($this->pars_trans_arr) == count($this->pars_data)) {
            foreach ($extracts as $key => $value) {
                $rx = '#{/%-{' . $key . '-([\d]+)}-%/}#';
                $extracts[$key] = preg_replace_callback($rx, function ($matches) {
                    return trim($this->pars_trans_arr[$matches[1]]);
                }, $this->pars_text[$key]);
            }
            return 0;
        }
        return 1;
    }

    public function parse_clean()
    {
        $this->pars_data = [];
        $this->pars_text = [];
    }
}

$trans = new Trans();
$trans->parse_clean();
$trans->pars($_GET['text'], 'text');
$extract_items = ['text' => ''];
$trans->translate_pars($extract_items);
$res = json_encode(["text" => $extract_items['text']]);

echo htmlspecialchars($_GET['callback'], ENT_QUOTES) . '(' . $res . ');';
