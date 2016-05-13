package org.duyi.waterVis;

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
import org.springframework.web.bind.annotation.ResponseBody;

/**
 * Created by yidu on 5/12/16.
 */
@Controller
public class WaterVisController {
    private static final String DB_NAME = "airdb";
    private static MongoClient client = new MongoClient("127.0.0.1");

    /**
     * 返回所有城市列表
     * modified by yidu at Purdue
     * @return [{},{}]
     */
    @RequestMapping("waterquality.do")
    public @ResponseBody String getAllData() {
        MongoDatabase db = client.getDatabase(DB_NAME);
        MongoCollection coll = db.getCollection("water");
        MongoCursor cur = coll.find().sort(new Document("time", 1)).iterator();
        JSONObject oneValue;
        JSONArray result = new JSONArray();
        Document d;
        while(cur.hasNext()){
            d = (Document)cur.next();
            oneValue = new JSONObject();
            try {
                oneValue.put("time", d.getDate("city"));
                oneValue.put("code", d.getInteger("code"));
                oneValue.put("type", d.getString("type"));
                oneValue.put("ph", d.getDouble("ph"));
                oneValue.put("o2", d.getDouble("o2"));
                oneValue.put("no", d.getDouble("no"));
                oneValue.put("c", d.getDouble("c"));
            } catch (JSONException e) {
                e.printStackTrace();
            }
            result.put(oneValue);
        }

        return result.toString();
    }
}
