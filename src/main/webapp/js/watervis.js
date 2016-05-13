/**
 * Created by yidu on 5/12/16.
 */

function init(){
    $.ajax({
        url:"waterquality.do",
        type:"get",
        dataType:"json",
        success:function(returnData) {
            var data = JSON.parse(returnData);
            var parsed = d3.nest().key(function(d) { return d.code; })
                .entries(data);
            d3.select("#llcgroup")
        }
    });

}