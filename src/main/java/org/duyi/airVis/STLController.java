package org.duyi.airVis;

import com.github.brandtg.stl.StlDecomposition;
import com.github.brandtg.stl.StlResult;
import com.mongodb.MongoClient;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoCursor;
import com.mongodb.client.MongoDatabase;
import org.bson.Document;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

import javax.print.Doc;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;

/**
 * Created by yidu on 4/7/16.
 */

@Controller
public class STLController {

    private static final String NEW_DB_NAME = "airdb";

    /**
     * [{"_id":"Thu Jan 22 22:00:00 EST 2015","pm25":168.5},{"_id":"Thu Jan 22 21:00:00 EST 2015","pm25":184.875}
     * 返回stl结果
     */
    @RequestMapping(value = "stl.do", method = RequestMethod.POST)
    public
    @ResponseBody
    String stl(String[] codes, String startTime, String endTime) {
        if(startTime == null || endTime == null){
            return "no time";
        }else if(codes == null || codes.length == 0) {
            return "no codes";
        }

        JSONArray result = new JSONArray();
        MongoClient client = new MongoClient();
        MongoDatabase db = client.getDatabase(NEW_DB_NAME);
        MongoCollection coll = db.getCollection("pm_data");
        Calendar cal = Calendar.getInstance();
        //TODO time zone problem
        SimpleDateFormat df = new SimpleDateFormat("EEE MMM dd yyyy HH:mm:ss");

        Document match;
        Document group = new Document().append("$group",
                new Document().append("_id", "$time")
                        .append("pm25", new Document("$avg", "$pm25")));
        Document sort = new Document().append("$sort", new Document("_id", 1));
        List<Document> query = new ArrayList<Document>();
        MongoCursor cur;

        ArrayList<String> codeFilter = new ArrayList<String>();
        for(int i = 0; i < codes.length; i ++){
            codeFilter.add(codes[i]);
        }

        try {
            cal.setTime(df.parse(startTime));
            match = new Document("$match",
                    new Document("time",
                            new Document("$gt", df.parse(startTime)).append("$lt", df.parse(endTime)))
                            .append("code", new Document().append("$in", codeFilter))
                            .append("pm", new Document("$ne", 0)));
            query.add(match);
            query.add(group);
            query.add(sort);
        }catch(ParseException e){
            e.printStackTrace();
        }
        cur = coll.aggregate(query).iterator();
        ArrayList<Number> value = new ArrayList<Number>();
        ArrayList<Number> time = new ArrayList<Number>();
        Document pre = null;
        while(cur.hasNext()){
            Document d = (Document)cur.next();
            if(pre == null) {
                value.add(d.getDouble("pm25"));
                time.add(d.getDate("_id").getTime());
                pre = d;
            }else{
                int interval = (int)((d.getDate("_id").getTime() - pre.getDate("_id").getTime())/ (1000*60*60));
                if(interval == 1){

                }else{
                    for(int i = 0; i < (interval-1); i ++){
                        value.add(pre.getDouble("pm25")+(i+1)*(d.getDouble("pm25")-pre.getDouble("pm25"))/interval);
                        time.add(pre.getDate("_id").getTime()+(i+1)*(1000*60*60));
                    }
                }
                value.add(d.getDouble("pm25"));
                time.add(d.getDate("_id").getTime());
                pre = d;
            }
        }
//        System.out.println(time.size()+":"+value.size());
        final StlDecomposition stl = new StlDecomposition(24);
        StlResult deResult = stl.decompose(time, value);
        try {
            for(int i = 0; i < deResult.getRemainder().length; i ++){
                JSONObject a = new JSONObject();
                a.put("trend", deResult.getTrend()[i]);
                a.put("reminder", deResult.getRemainder()[i]);
                a.put("seasonal", deResult.getSeasonal()[i]);
                a.put("time", deResult.getTimes()[i]);
                a.put("value", deResult.getSeries()[i]);
                result.put(a);
            }
        }catch(JSONException e){
            e.printStackTrace();
        }

        return result.toString();
    }
}
