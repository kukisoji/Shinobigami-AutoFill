// デバウンス関数
function debounce(func, wait) {
  let timeout = null;
  return function (...args) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

// 実行状態を管理するPromise
if (typeof window.executionPromise === "undefined") {
  window.executionPromise = Promise.resolve();
}

// GabaCheckStart関数をデバウンスして実行状態を管理する
const debouncedGabaCheckStart = debounce(() => {
  GabaCheckStart();
}, 300); // 300ミリ秒のデバウンス時間

//メッセージキャッチャー
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "searchArrayAndOutput") {
    console.log("忍法名見つけたいなぁ");
    searchArrayAndOutput();
  } else if (request.action === "GabaCheckStart") {
    console.log("ガﾞバﾞいﾞ子ﾞはﾞいﾞねﾞぇﾞかﾞぁﾞ！");
    debouncedGabaCheckStart();
  }
});

//忍法検索処理
async function searchArrayAndOutput() {
  let arrayData = null;
  try {
    arrayData = await loadArrayFromFile();
  } catch (error) {
    console.error("Error loading array data:", error);
    return;
  }

  let i = 0;
  let id_name = "ninpou." + String(i);
  let outputElement;
  let ColumnValue;
  let targetSkillElement;
  const regexToRemove =
    /L|　|\s|→|\＜|\＞|\(|\/|\)|離し|かわし|殺し|崩し|宿し|晴らし|必要生命|二度限定|使用許諾|回避反動|不安要素|必要物資|双子/g;
  const batten_yurusumazi = /(☓|☒|✗|✘|×|✕|❌️|✖|❎️|X|x)天/;

  //忍法の数だけぐーるぐる
  while (document.getElementById(id_name)) {
    const targetElement = document.getElementById(id_name + ".name");
    if (targetElement) {
      let info = targetElement.value || targetElement.textContent;

      //忍法名から不要な文言を削除
      info = info.replace(regexToRemove, "");

      //✕天を確実に適した形にする。許さねぇ✕天
      if (batten_yurusumazi.test(info)) {
        info = "✕天";
      }

      //忍法の検索
      const result = arrayData.find((row) => row[0] == info);

      outputElement = document.getElementById(id_name + ".type");

      //忍法が見つかったら処理開始。見つからなかったら無視します。
      if (outputElement && result != undefined) {
        ColumnValue = result ? result[1] : "";
        outputElement.value = ColumnValue;

        //忍法のタイプに合わせて処理を変更
        if (ColumnValue == "装備") {
          document.getElementById(id_name + ".range").value = "なし";
          document.getElementById(id_name + ".cost").value = "なし";
          document.getElementById(id_name + ".targetSkill").value = "なし";
        } else if (ColumnValue == "攻撃" || ColumnValue == "サポート") {
          document.getElementById(id_name + ".range").value = result
            ? result[2]
            : "";
          document.getElementById(id_name + ".cost").value = result
            ? result[3]
            : "";
          const targetSkillElement = document.getElementById(id_name + '.targetSkill');
          // .targetSkill要素が存在し、値が空でない場合は更新しない
          if (targetSkillElement && targetSkillElement.value === "") {
            targetSkillElement.value = result ? result[4] : '';
          }

        }

        document.getElementById(id_name + ".page").value = result
          ? result[5]
          : "";

        let effectElement = document.getElementById(id_name + ".effect");

        //忍法効果記入ゾーン
        if (effectElement && effectElement.value !== "") {
          //忍法効果が既に記入されていたら、そのデータをローカルに保存
          chrome.storage.local.set(
            { [info]: effectElement.value },
            function () {
              console.log(
                "値が保存されました：",
                info,
                ":",
                effectElement.value
              );
            }
          );
        } else {
          //忍法効果が未記載の場合、保存データを確認して取ってくる
          chrome.storage.local.get(info, function (getNinpo) {
            const savedValue = getNinpo[info];
            if (savedValue) {
              effectElement.value = savedValue;
              console.log(
                "保存された値を表示しました：",
                info,
                ":",
                savedValue
              );
            } else {
              console.log("保存された値がありません：", info);
            }
          });
        }
      } else {
        console.error("Output element not found");
      }

      i++;
      id_name = "ninpou." + ("000" + i).slice(-3);
    } else {
      console.error("Target element not found");
    }
  }

  //変更イベント着火(これを入れないと表面上変更されていないように見えちゃう)
  const event = new Event("input", { bubbles: true, cancelable: true });
  outputElement.dispatchEvent(event);
  const changeEvent = new Event("change", { bubbles: true, cancelable: true });
  outputElement.dispatchEvent(changeEvent);
}

//ガバチェック
async function GabaCheckStart() {
  let arrayData = null;
  try {
    arrayData = await loadRyuhaFile();
  } catch (error) {
    console.error("Error loading array data:", error);
    return;
  }

  //タイプが忍者ならチェック開始
  if (document.getElementById("base.race").value == "1") {
    let i = 0;
    let id_name = "ninpou." + String(i);
    let s = 0;
    let sp_name = "secret.specialEffect." + String(s);
    let GabaFlag = false;
    let ErrMsg = "以下の箇所でガバが発見されました。\n";
    let selectedCount;
    let RyuhaFlag = 9;
    let ZyoiRyuha;
    let KaiRyuha = document.getElementById("base.substyle").value;

    //流派指定部分を埋めたりちょっと変えたり
    if (!KaiRyuha.trim()) {
      KaiRyuha = "上位流派";
    } else if (KaiRyuha === "特教委") {
      KaiRyuha = "特命臨時教職員派遣委員会";
    }

    //もうここで特技の一覧取っちゃうぜ
    let selectedTokugi = document.querySelectorAll(
      `.input.skillcol.selected.selected > [id^="skills.row"][id*=".name"]`
    );
    const textContents = Array.from(selectedTokugi).map(
      (selectedTokugi) => selectedTokugi.textContent
    );

    //流派名で配列検索
    const result = arrayData.find((row) => row[0] === KaiRyuha);

    if (result) {
      //流派に合わせて上位流派を変更
      if (result[5] && result[5] !== undefined) {
        triggerStyleChange(result[5]);
      }

      ZyoiRyuha = document.getElementById("base.upperstyle").value;

      switch (ZyoiRyuha) {
        case "a":
          RyuhaFlag = 0;
          break;
        case "ab":
          RyuhaFlag = 1;
          break;
        case "bc":
          RyuhaFlag = 2;
          break;
        case "cd":
          RyuhaFlag = 3;
          break;
        case "de":
          RyuhaFlag = 4;
          break;
        case "e":
          RyuhaFlag = 5;
          break;
        default:
          console.log("予期しない値です：", ZyoiRyuha);
          GabaFlag = true;
          ErrMsg =
            ErrMsg + "上位流派が記入されていない、もしくは異常な値です。\n";
      }

      //上位流派が正しく記入されている場合のみ続行
      if (RyuhaFlag != 9) {
        selectedCount = document.querySelectorAll(
          `.input.skillcol.selected.selected > [id^="skills.row"][id$=".name${RyuhaFlag}"]`
        ).length;

        //所属条件の判定
        if (result[1] == 0) {
          //上位流派の場合
          if (selectedCount < 3) {
            GabaFlag = true;
            ErrMsg = ErrMsg + "得意分野の特技数が3つ以下です。\n";
          }
        } else {
          //下位流派
          if (selectedCount < 2) {
            GabaFlag = true;
            ErrMsg = ErrMsg + "得意分野の特技数が2つ以下です。\n";
          }
          switch (result[1]) {
            case 2:
              //所属条件が忍法の場合
              let NinpoElement = document.querySelectorAll(
                `[id^="ninpou."][id*=".name"]`
              );
              const ninpoList = Array.from(NinpoElement).map(
                (NinpoElement) => NinpoElement.value
              );
              const NinpoMatch = ninpoList.some((element) =>
                element.includes(result[2])
              );
              if (!NinpoMatch) {
                GabaFlag = true;
                ErrMsg =
                  ErrMsg +
                  "必要な忍法を修得していません。" +
                  result[2] +
                  "を修得してください。\n";
              }
              break;
            case 3:
              //所属条件が特技の場合
              const JokenTokugi = result.slice(2, 5);
              const filteredArray = JokenTokugi.filter(Boolean);
              const hasMatch = textContents.some((element) =>
                filteredArray.includes(element)
              );
              if (!hasMatch) {
                GabaFlag = true;
                ErrMsg =
                  ErrMsg +
                  "必要な特技を修得していません。下記の特技を取得してください。\n[" +
                  filteredArray +
                  "]\n";
              }
              if (KaiRyuha == "常夜") {
                if (
                  document.getElementById("base.sex").value.indexOf("女") == -1
                ) {
                  GabaFlag = true;
                  ErrMsg = ErrMsg + "常夜は女性のみ所属できます。\n";
                }
              }
              break;
            case 4:
              //所属条件が特技分野の場合
              if (
                document.querySelectorAll(
                  `.input.skillcol.selected.selected > [id^="skills.row"][id$=".name${result[2]}"]`
                ).length < 1
              ) {
                GabaFlag = true;
                let TarinaiBunya;
                switch (result[2]) {
                  case 0:
                    TarinaiBunya = "器術";
                    break;
                  case 1:
                    TarinaiBunya = "体術";
                    break;
                  case 2:
                    TarinaiBunya = "忍術";
                    break;
                  case 3:
                    TarinaiBunya = "謀術";
                    break;
                  case 4:
                    TarinaiBunya = "戦術";
                    break;
                  case 5:
                    TarinaiBunya = "妖術";
                    break;
                }
                ErrMsg =
                  ErrMsg +
                  "特定の特技分野に特技がありません。" +
                  TarinaiBunya +
                  "分野から特技を修得してください。\n";
              }
              if (KaiRyuha == "外事N課") {
                if (
                  document.querySelectorAll(
                    `.input.skillcol.selected.selected > [id^="skills.row"][id$=".name${result[3]}"]`
                  ).length < 1
                ) {
                  GabaFlag = true;
                  ErrMsg =
                    ErrMsg +
                    "特定の特技分野に特技がありません。忍術分野から特技を修得してください。\n";
                }
              }
              break;
            case 5:
              //醜女衆および義経流
              if (KaiRyuha == "醜女衆") {
                if (
                  document.getElementById("base.sex").value.indexOf("女") == -1
                ) {
                  GabaFlag = true;
                  ErrMsg = ErrMsg + "醜女衆は女性のみ所属できます。";
                }
              } else if (KaiRyuha == "義経流") {
                if (
                  document.querySelectorAll(
                    `.input.skillcol.selected.selected > [id^="skills.row"][id$=".name1"]`
                  ).length +
                    document.querySelectorAll(
                      `.input.skillcol.selected.selected > [id^="skills.row"][id$=".name4"]`
                    ).length <
                  1
                ) {
                  GabaFlag = true;
                  ErrMsg =
                    ErrMsg +
                    "特定の特技分野に特技がありません。体術分野、もしくは戦術分野から特技を修得してください。";
                }
              }
              break;
          }
        }
      }

      //奥義チェック
      while (document.getElementById(sp_name)) {
        // .skill 要素の確認
        const skillElement = document.getElementById(sp_name + ".skill");

        if (skillElement) {
          const skillValue = skillElement.value;
          const ogiMatch = textContents.some((element) =>
            skillValue.includes(element)
          );

          if (skillValue === "") {
            GabaFlag = true;
            ErrMsg += "奥義の指定特技が記入されていません。\n";
          } else if (!ogiMatch) {
            GabaFlag = true;
            ErrMsg +=
              "奥義の指定特技として指定されている" +
              skillValue +
              "を修得していません。\n";
          }
        }

        console.log("奥義チェックヨシ！：", sp_name);
        s++;
        sp_name = "secret.specialEffect." + ("000" + s).slice(-3);
      }
      console.log("奥義チェック終わり！");

      //忍法の特技チェック
      while (document.getElementById(id_name)) {
        // .targetSkill 要素の確認
        const targetSkillElement = document.getElementById(
          id_name + ".targetSkill"
        );
        if (targetSkillElement) {
          const targetSkillValue = targetSkillElement.value;
          if (targetSkillValue === "" || targetSkillValue === "自由") {
            GabaFlag = true;
            ErrMsg +=
              document.getElementById(id_name + ".name").value +
              "の指定特技がありません。\n";
          }
        }
        console.log("忍法チェックヨシ！：", id_name);
        i++;
        id_name = "ninpou." + ("000" + i).slice(-3);
      }
      console.log("忍法チェック終わり！");

      //結果発表～！
      if (GabaFlag) {
        alert(ErrMsg);
      } else {
        alert("特に問題はないようです。\n");
      }
    } else {
      alert(
        "流派が見つかりませんでした。この拡張機能では独自流派のチェックは出来ません。"
      );
    }
  }
}

//忍法一覧ファイル読み込み
function loadArrayFromFile() {
  return fetch(chrome.runtime.getURL("array_data.json")).then((response) => {
    if (!response.ok) {
      throw new Error(
        `HTTP error status: ${response.status} ${response.statusText}`
      );
    }
    return response.json();
  });
}

//流派所属条件ファイル読み込み
function loadRyuhaFile() {
  return fetch(chrome.runtime.getURL("Ryuha_data.json")).then((response) => {
    if (!response.ok) {
      throw new Error(
        `HTTP error status: ${response.status} ${response.statusText}`
      );
    }
    return response.json();
  });
}

//上位流派変更イベント発火
function triggerStyleChange(newValue) {
  const upperstyleElement = document.getElementById("base.upperstyle");
  if (upperstyleElement) {
    // 値を設定
    upperstyleElement.value = newValue;

    // changeイベントを発火
    const event = new Event("change", {
      bubbles: true,
      cancelable: true,
    });
    upperstyleElement.dispatchEvent(event);
  }
}

document.addEventListener("DOMContentLoaded", searchArrayAndOutput);
