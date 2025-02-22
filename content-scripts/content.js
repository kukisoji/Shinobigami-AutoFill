// デバウンス関数
function debounce(func) {
  let timeout = null;
  return function (...args) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, 300);
  };
}

// 実行状態を管理するPromise
if (typeof window.executionPromise === "undefined") {
  window.executionPromise = Promise.resolve();
}

// GabaCheckStart関数をデバウンスして実行状態を管理する
const debouncedGabaCheckStart = debounce(GabaCheckStart);

// searchArrayAndOutput関数をデバウンスして実行状態を管理する
const debouncedsearchArrayAndOutput = debounce(searchArrayAndOutput);

//メッセージキャッチャー
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "searchArrayAndOutput") {
    console.log("忍法名見つけたいなぁ");
    debouncedsearchArrayAndOutput();
  } else if (request.action === "GabaCheckStart") {
    console.log("ガﾞバﾞいﾞ子ﾞはﾞいﾞねﾞぇﾞかﾞぁﾞ！");
    debouncedGabaCheckStart();
  }
});

//忍法検索処理
async function searchArrayAndOutput() {
  const loadFiles = async (fileNames) => {
    return Promise.all(fileNames.map(loadFile));
  };

  // 使用例
  const [arrayData, Kinin_list, Gotochi_list, syageki_list, syudan_list] =
    await loadFiles([
      "array_data.json",
      "Kinin_List.json",
      "Gotochi_list.json",
      "syageki_data.json",
      "syudan_data.json",
    ]);

  let i = 0;
  let id_name = "ninpou." + String(i);

  //忍法名から不必要な文言を取り除く用
  const regexToRemove =
    /L|\s|→|\＜|\＞|\(|\/|\)|（|）|【|】|追加忍法|かわし|離し|殺し|崩し|宿し|晴らし|必要生命|二度限定|使用許諾|回避反動|不安要素|必要物資|双子/g;

  //✕天を処理できる形に変更する用
  const batten_yurusumazi = /(☓|☒|✗|✘|×|✕|❌️|✖|❎️|X|x)天/;

  //変更フラグ。コスト間合指定特技を変更する可能性があるものをピックアップ中
  //コストアップ忍法
  const ChangeNinpo_costup = [
    "機忍", //コスト1上昇&絡繰術に特技変更
    "ご当地戦法", //コスト1上昇&特技変更(自由)
    "眼力", //黒脛巾組限定でコスト1上昇
  ];
  const ChangeNinpo_costdown = [
    "爪紅", //忍法を一つコスト1減少&特技を九ノ一の術に
    "忍法回路", //すべてのサポート忍法のコスト1減少
    "大統一忍法", //追加忍法のコスト2減少
  ];
  const ChangeNinpo_rangeup = [
    "翼煙管", //サポート忍法の間合1上昇
    "拡視器", //瞳術もしくは千里眼の術の忍法の間合を2上昇
    "鷹の目", //射撃戦忍法のみ間合1上昇
    "鈎陣", //集団戦攻撃のみ間合1上昇
  ];
  const ChangeNinpo_skillChange = [
    "機忍", //コスト1上昇&絡繰術に特技変更
    "ご当地戦法", //コスト1上昇&特技変更(自由)
    "魔具螺", //特技変更
    "爪紅", //忍法を一つコスト1減少&特技を九ノ一の術に
  ];

  // 間合変化の値を定数で管理
  const RANGE_INCREMENT = {
    TSUBASAKISERU: 1,
    KAKUSHIKI: 2,
    TAKANOTSUME: 1,
    MAGGARIN: 1,
    SPECIAL_EFFECT: 2,
  };

  //コスト変化の値を定数で管理
  const COST_ADJUSTMENT = {
    KININ: 1,
    GOTOCHI: 1,
    GANRIKI: 1,
    TSUMABENI: -1,
    NINPO_KAIRO: -1,
    SPECIAL_HERASHI: -2,
    SPECIAL_KIRYOKU: 1,
    DAITOITSU: -2,
  };

  const result_col = {
    name: 0,
    type: 1,
    range: 2,
    cost: 3,
    skill: 4,
    page: 5,
    ryuha: 6,
  };

  //忍法名リストの取得。「機忍があったら特定の忍法のコスト増加」等の処理を行う用。
  let NinpoElement = getElementsByPrefix("ninpou.", ".name");
  const ninpoList = Array.from(NinpoElement).map(
    (NinpoElement) => NinpoElement.value
  );

  //背景リストの取得。「外国妖怪所持による特技の不変更」等の処理を行う用。
  let backgroundElement = getElementsByPrefix("background.", ".name");
  const backgroundList = Array.from(backgroundElement).map(
    (backgroundElement) => backgroundElement.value
  );
  //奥義効果リストの取得。追加忍法による離しや減らし、指定特技の変更をチェックする用
  let specialEffectElement = getElementsByPrefix(
    "secret.specialEffect.",
    ".effect"
  );
  let specialskillElement = getElementsByPrefix(
    "secret.specialEffect.",
    ".skill"
  );
  //追加忍法のみリストにぶち込んでおく
  const specialEffectList = Array.from(specialEffectElement).reduce(
    (acc, effectElement, index) => {
      if (effectElement.value.includes("追加忍法")) {
        acc.push([effectElement.value, specialskillElement[index].value]);
      }
      return acc;
    },
    []
  );

  //チェック用配列の作成
  // コスト上昇忍法を所持しているか
  const FlagListNinpo_costup = createFlagList(ninpoList, ChangeNinpo_costup);
  const FlagListNinpo_costdown = createFlagList(
    ninpoList,
    ChangeNinpo_costdown
  );
  const FlagListNinpo_rangeup = createFlagList(ninpoList, ChangeNinpo_rangeup);
  const FlagListNinpo_skillChange = createFlagList(
    ninpoList,
    ChangeNinpo_skillChange
  );

  //間合上昇要素があるか確認
  const shouldAdjustRange =
    FlagListNinpo_rangeup.some(Boolean) ||
    (specialEffectList.length > 0 &&
      specialEffectList.some(([EffectElement]) =>
        EffectElement.includes("離し")
      ));

  //コスト変化要素があるか確認
  const hasCostAdjustment =
    FlagListNinpo_costdown.some(Boolean) ||
    FlagListNinpo_costup.some(Boolean) ||
    (specialEffectList.length > 0 &&
      (EffectElement.includes("減らし") || EffectElement.includes("気力消耗")));

  // 上位流派のマッピング
  const RYUHA_MAP = [
    "斜歯忍軍",
    "鞍馬神流",
    "ハグレモノ",
    "比良坂機関",
    "私立御斎学園",
    "隠忍の血統",
  ];

  //これで上位流派をゲット
  const ZyoiRyuha = RYUHA_MAP[zyoiRyuha_get()];

  //下位流派(機忍確認用)
  let KaiRyuha = document.getElementById("base.substyle").value;
  if (KaiRyuha === "特教委") {
    KaiRyuha = "特命臨時教職員派遣委員会";
  } else if (!KaiRyuha || KaiRyuha === "上位流派") {
    KaiRyuha = ZyoiRyuha;
  }

  //忍法の概要を持っておく用の簡易関数
  const getCachedElements = (baseId) => ({
    checkbox: document.getElementById(`${baseId}.secret`),
    name: document.getElementById(`${baseId}.name`),
    type: document.getElementById(`${baseId}.type`),
    range: document.getElementById(`${baseId}.range`),
    cost: document.getElementById(`${baseId}.cost`),
    targetSkill: document.getElementById(`${baseId}.targetSkill`),
    page: document.getElementById(`${baseId}.page`),
    effect: document.getElementById(`${baseId}.effect`),
  });

  //忍法の数だけぐーるぐる
  while (document.getElementById(id_name)) {
    const elements = getCachedElements(id_name);
    const targetElement = elements.name;
    if (targetElement) {
      let info = targetElement.value || targetElement.textContent;

      //忍法名から不要な文言を削除
      let InfoRem = info.replace(regexToRemove, "");

      //✕天を確実に適した形にする。許さねぇ✕天
      if (batten_yurusumazi.test(InfoRem)) {
        InfoRem = "✕天";
      }

      //忍法の検索
      const result = arrayData.find((row) => row[result_col.name] == InfoRem);

      //忍法が見つかったら処理開始。見つからなかったら無視します。
      if (!result) return;
      elements.type.value = result ? result[result_col.type] : "";

      //忍法のタイプに合わせて処理を変更
      if (elements.type.value == "装備") {
        //装備忍法ならいろいろ「なし」にする
        elements.range.value = "なし";
        elements.cost.value = "なし";
        elements.targetSkill.value = "なし";
      } else if (
        elements.type.value == "攻撃" ||
        elements.type.value == "サポート"
      ) {
        //事前に入っていた特技の確認
        before_targetskill = elements.targetSkill.value;
        targetSkill = result ? result[result_col.skill] : "";
        //好きな◯術用に、あらかじめ変更前特技の分野を調べておく
        SkillField = getSkillList(before_targetskill);
        if (
          FlagListNinpo_skillChange.some((flag) => flag === true) ||
          backgroundList.includes("外国妖怪") ||
          (specialEffectList.length > 0 && info.includes("追加忍法"))
        ) {
          if (
            info.includes("追加忍法") &&
            !specialEffectList.some(
              ([, skillValue]) => skillValue === before_targetskill
            )
          ) {
            elements.targetSkill.value = specialEffectList[0][1];
          } else if (
            ninpoList.includes("機忍") && //機忍所持
            elements.type.value == "サポート" && //サポート忍法
            Kinin_list.includes(result[result_col.ryuha]) && //忍法の元流派が機忍で取ってこれる範囲か
            KaiRyuha != result[result_col.ryuha] &&
            ZyoiRyuha != result[result_col.ryuha] //所属流派の忍法ではない(他流派機忍対策)
          ) {
            elements.targetSkill.value = "絡繰術";
          }
        } else if (
          SkillField != targetSkill && //事前に入ってた特技が好きな◯術に当てはまらない
          targetSkill != "自由" && //指定特技が自由ではない
          !targetSkill.includes(before_targetskill) //事前に入ってた特技が忍法の指定特技一覧に含まれない
        ) {
          elements.targetSkill.value = targetSkill;
        }
        if (!elements.targetSkill.value || elements.targetSkill.value == "") {
          //空白なら突っ込んでおく
          elements.targetSkill.value = targetSkill;
        }

        //間合関連(拡視器の関係で特技決定後)
        targetrange = result?.[result_col.range] ?? "";
        let targetrange_int = Number(targetrange);
        let modified = false;
        if (
          //間合変更忍法があるか確認
          shouldAdjustRange &&
          targetrange != "なし"
        ) {
          if (
            ninpoList.includes("翼煙管") &&
            elements.type.value === "サポート"
          ) {
            targetrange_int += RANGE_INCREMENT.TSUBASAKISERU;
            modified = true;
          }

          if (
            ninpoList.includes("拡視器") &&
            ["瞳術", "千里眼の術"].includes(elements.targetSkill.value)
          ) {
            targetrange_int += RANGE_INCREMENT.KAKUSHIKI;
            modified = true;
          }

          if (ninpoList.includes("鷹の目") && syageki_list.includes(InfoRem)) {
            targetrange_int += RANGE_INCREMENT.TAKANOTSUME;
            modified = true;
          }

          if (ninpoList.includes("鈎陣") && syudan_list.includes(InfoRem)) {
            targetrange_int += RANGE_INCREMENT.MAGGARIN;
            modified = true;
          }

          if (
            specialEffectList.length > 0 &&
            info.includes("追加忍法") &&
            specialEffectList.some(([EffectElement]) =>
              EffectElement.includes("離し")
            )
          ) {
            targetrange_int += RANGE_INCREMENT.SPECIAL_EFFECT;
            modified = true;
          }
        }
        elements.range.value = (() => {
          if (targetrange == "なし") return "なし";

          if (shouldAdjustRange) {
            return modified
              ? `${targetrange_int}(${result[result_col.range]})`
              : targetrange;
          }
          return targetrange;
        })();

        //コスト関連
        const originalCost = result?.[result_col.cost] ?? "";
        let targetcost = parseInt(originalCost, 10) || 0;

        if (hasCostAdjustment) {
          const isSupportType = elements.type.value === "サポート";
          const isAttackType = elements.type.value === "攻撃";
          const adjustments = [
            {
              condition:
                ninpoList.includes("機忍") &&
                isSupportType &&
                Kinin_list.includes(result?.[result_col.ryuha]) &&
                KaiRyuha != result[result_col.ryuha] &&
                ZyoiRyuha != result[result_col.ryuha],
              value: COST_ADJUSTMENT.KININ,
            },
            {
              condition:
                ninpoList.includes("ご当地戦法") &&
                isAttackType &&
                Gotochi_list.includes(result?.[result_col.ryuha]) &&
                KaiRyuha != result[result_col.ryuha] &&
                ZyoiRyuha != result[result_col.ryuha],
              value: COST_ADJUSTMENT.GOTOCHI,
            },
            {
              condition:
                ninpoList.includes("眼力") &&
                result?.[result_col.ryuha] === "黒脛巾組",
              value: COST_ADJUSTMENT.GANRIKI,
            },
            {
              condition:
                ninpoList.includes("爪紅") &&
                currentSkill === "九ノ一の術" &&
                result?.[result_col.range] !== "九ノ一の術",
              value: COST_ADJUSTMENT.TSUMABENI,
            },
            {
              condition: ninpoList.includes("忍法回路") && isSupportType,
              value: COST_ADJUSTMENT.NINPO_KAIRO,
            },
            {
              condition:
                ninpoList.includes("大統一忍法") && info.includes("追加忍法"),
              value: COST_ADJUSTMENT.DAITOITSU,
            },
            {
              condition:
                specialEffectList.length > 0 &&
                info.includes("追加忍法") &&
                specialEffectList.some(([EffectElement]) =>
                  EffectElement.includes("減らし")
                ),
              value: COST_ADJUSTMENT.SPECIAL_HERASHI,
            },
            {
              condition:
                specialEffectList.length > 0 &&
                info.includes("追加忍法") &&
                specialEffectList.some(([EffectElement]) =>
                  EffectElement.includes("気力消耗")
                ),
              value: COST_ADJUSTMENT.SPECIAL_KIRYOKU,
            },
          ];

          adjustments.forEach(({ condition, value }) => {
            if (condition) targetcost += value;
          });

          //コスト減少の結果0を下回ったら0にする
          targetcost = Math.max(targetcost, 0);

          //コスト表示決定
          const formatCost = () => {
            if (targetcost === 0 && originalCost === "なし")
              return originalCost;

            const hasChanged =
              targetcost !== (parseInt(originalCost, 10) || 0) ||
              (targetcost === 0 && originalCost !== "なし") ||
              (targetcost !== 0 && originalCost === "なし");

            if (!hasChanged) return originalCost;

            const specialCases = ["闇斑", "車華火", "電磁剣"];
            const suffix = specialCases.includes(InfoRem) ? "～" : "";
            return `${targetcost}${suffix}(${originalCost})`;
          };

          elements.cost.value = formatCost();
        } else {
          //コスト変化の要素がないならそのまま値を入れとくね……
          elements.cost.value = originalCost;
        }
      }

      //記載ページ
      elements.page.value = result ? result[result_col.page] : "";

      //忍法効果記入ゾーン
      if (elements.effect && elements.effect.value !== "") {
        //忍法効果が既に記入されていたら、そのデータをローカルに保存
        chrome.storage.local.set(
          { [InfoRem]: elements.effect.value },
          function () {
            console.log(
              "値が保存されました：",
              InfoRem,
              ":",
              elements.effect.value
            );
          }
        );
      } else {
        //忍法効果が未記載の場合、保存データを確認して取ってくる
        chrome.storage.local.get(InfoRem, function (getNinpo) {
          const savedValue = getNinpo[InfoRem];
          if (savedValue) {
            elements.effect.value = savedValue;
            console.log(
              "保存された値を表示しました：",
              InfoRem,
              ":",
              savedValue
            );
          } else {
            console.log("保存された値がありません：", InfoRem);
          }
        });
      }

      i++;
      id_name = "ninpou." + ("000" + i).slice(-3);
    } else {
      console.error("Target element not found");
    }
  }

  //変更イベント着火(これを入れないと表面上変更されていないように見えちゃう)
  if (typeof updateUI === "function") {
    updateUI();
  }
}

//ガバチェック
async function GabaCheckStart() {
  let Ryuha_data = null;
  Ryuha_data = await loadFile("Ryuha_data.json");

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

    const getCachedElements = (baseId) => ({
      targetSkill: document.getElementById(`${baseId}.targetSkill`),
    });

    //もうここで特技の一覧取っちゃうぜ
    let selectedTokugi = document.querySelectorAll(
      `.input.skillcol.selected.selected > [id^="skills.row"][id*=".name"]`
    );
    const textContents = Array.from(selectedTokugi).map(
      (selectedTokugi) => selectedTokugi.textContent
    );

    //流派名で配列検索
    const result = Ryuha_data.find((row) => row[0] === KaiRyuha);

    if (result) {
      //流派に合わせて上位流派を変更
      if (result[5] && result[5] !== undefined) {
        triggerStyleChange(result[5]);
      }

      RyuhaFlag = zyoiRyuha_get();

      if (RyuhaFlag == 9) {
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
            ErrMsg +=
              String(s + 1) + "番目の奥義の指定特技が記入されていません。\n";
          } else if (!ogiMatch) {
            GabaFlag = true;
            ErrMsg +=
              String(s + 1) +
              "番目の奥義の指定特技として指定されている" +
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
        const elements = getCachedElements(id_name);

        if (elements.targetSkill) {
          const targetSkillValue = elements.targetSkill.value;
          if (
            targetSkillValue === "" ||
            targetSkillValue === "自由" ||
            targetSkillValue.includes("好きな")
          ) {
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

//ファイル読み込み
async function loadFile(fileName) {
  try {
    const response = await fetch(chrome.runtime.getURL(fileName));
    if (!response.ok) {
      throw new Error(
        `HTTP error status: ${response.status} ${response.statusText}`
      );
    }
    return await response.json();
  } catch (error) {
    console.error(`Error loading file (${fileName}):`, error);
    return null;
  }
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

//キャラシ変更忍法を所持しているか確認するための汎用的な関数
function createFlagList(ninpoList, changeList) {
  return ninpoList.map((item) =>
    changeList.some((subStr) => item.includes(subStr))
  );
}

//特技分野リスト返却用関数
function getSkillList(targetSkill) {
  // 器術
  const kijutsu_list = [
    "絡繰術",
    "火術",
    "水術",
    "針術",
    "仕込み",
    "衣装術",
    "縄術",
    "登術",
    "拷問術",
    "壊器術",
    "掘削術",
  ];
  //体術
  const taijutsu_list = [
    "騎乗術",
    "砲術",
    "手裏剣術",
    "手練",
    "身体操術",
    "歩法",
    "走法",
    "飛術",
    "骨法術",
    "刀術",
    "怪力",
  ];
  //忍術
  const ninjutsu_list = [
    "生存術",
    "潜伏術",
    "遁走術",
    "盗聴術",
    "腹話術",
    "隠形術",
    "変装術",
    "香術",
    "分身の術",
    "隠蔽術",
    "第六感",
  ];
  //謀術
  const bojutsu_list = [
    "医術",
    "毒術",
    "罠術",
    "調査術",
    "詐術",
    "対人術",
    "遊芸",
    "九ノ一の術",
    "傀儡の術",
    "流言の術",
    "経済力",
  ];
  //戦術
  const senjutsu_list = [
    "兵糧術",
    "鳥獣術",
    "野戦術",
    "地の利",
    "意気",
    "用兵術",
    "記憶術",
    "見敵術",
    "暗号術",
    "伝達術",
    "人脈",
  ];
  //妖術
  const yojutsu_list = [
    "異形化",
    "召喚術",
    "死霊術",
    "結界術",
    "封術",
    "言霊術",
    "幻術",
    "瞳術",
    "千里眼の術",
    "憑依術",
    "呪術",
  ];

  if (kijutsu_list.includes(targetSkill)) {
    return "好きな器術";
  } else if (taijutsu_list.includes(targetSkill)) {
    return "好きな体術";
  } else if (ninjutsu_list.includes(targetSkill)) {
    return "好きな忍術";
  } else if (bojutsu_list.includes(targetSkill)) {
    return "好きな謀術";
  } else if (senjutsu_list.includes(targetSkill)) {
    return "好きな戦術";
  } else if (yojutsu_list.includes(targetSkill)) {
    return "好きな妖術";
  } else {
    return null; // 該当するリストがない場合
  }
}

function zyoiRyuha_get() {
  ZyoiRyuha = document.getElementById("base.upperstyle").value;

  switch (ZyoiRyuha) {
    case "a":
      return 0;
    case "ab":
      return 1;
    case "bc":
      return 2;
    case "cd":
      return 3;
    case "de":
      return 4;
    case "e":
      return 5;
    default:
      return 9;
  }
}

//要素取得用の汎用関数
function getElementsByPrefix(prefix, suffix) {
  return document.querySelectorAll(`[id^="${prefix}"][id*="${suffix}"]`);
}

document.addEventListener("DOMContentLoaded", searchArrayAndOutput);
