chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'searchArrayAndOutput') {
    console.log("忍法名見つけたいなぁ");
    searchArrayAndOutput();
  }
});

async function searchArrayAndOutput() {

  let arrayData = null;
  try {
    arrayData = await loadArrayFromFile();
  } catch (error) {
    console.error('Error loading array data:', error);
    return;
  }

  let i = 0;
  let id_name= 'ninpou.' + String(i);
  let outputElement;
  let ColumnValue;
  const batten_yurusumazi = /(☓|☒|✗|✘|×|✕|❌️|✖|❎️|X|x)天/;

  while (document.getElementById(id_name)) {
    const targetElement = document.getElementById(id_name + '.name');
    if (targetElement) {
      let info = targetElement.value || targetElement.textContent;

      if(batten_yurusumazi.test(info)){
        info = "✕天"
      }
      const result = arrayData.find(row => row[0] == info);

      outputElement = document.getElementById(id_name + '.type');

      if (outputElement) {
        ColumnValue = result ? result[1] : '';
        outputElement.value = ColumnValue

        if(ColumnValue == "装備"){

          document.getElementById(id_name + '.range').value = "なし"
          document.getElementById(id_name + '.cost').value = "なし"
          document.getElementById(id_name + '.targetSkill').value = "なし"

        } else {

          document.getElementById(id_name + '.range').value = result ? result[2] : '';
          document.getElementById(id_name + '.cost').value = result ? result[3] : '';
          document.getElementById(id_name + '.targetSkill').value = result ? result[4] : '';

        }
        
        document.getElementById(id_name + '.page').value = result ? result[5] : '';

      }

      i++;
      id_name = 'ninpou.' + ( '000' + i ).slice( -3 );

    } else {
      console.error('Target element not found');
    }
  }
  const event = new Event('input', { bubbles: true, cancelable: true });
  outputElement.dispatchEvent(event);

  const changeEvent = new Event('change', { bubbles: true, cancelable: true });
  outputElement.dispatchEvent(changeEvent);
}

function loadArrayFromFile() {
  return fetch(chrome.runtime.getURL('array_data.json'))
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error status: ${response.status} ${response.statusText}`);
      }
      return response.json();
    });
}

document.addEventListener('DOMContentLoaded', searchArrayAndOutput);
