<%@ page language="java" contentType="text/html; charset=UTF-8"
    pageEncoding="UTF-8"%>
    
<%@ page import="java.net.HttpURLConnection,java.net.URL,java.net.URLEncoder,java.io.InputStream,java.io.OutputStream" %>
<%
	String url = request.getParameter("url");
	// 取得连接  
    HttpURLConnection huc = (HttpURLConnection) new URL(url).openConnection();
	
    // 设置连接属性  
    huc.setDoOutput(true);  
    huc.setRequestMethod("GET");  
    huc.setUseCaches(false);  
    huc.setInstanceFollowRedirects(true);  
    huc.setRequestProperty("Content-Type","application/x-www-form-urlencoded");  
    huc.connect();  
    
    // 取得页面输出,并设置页面编码及缓存设置  
    response.setContentType(huc.getContentType());  
    response.setHeader("Cache-Control", huc.getHeaderField("Cache-Control"));  
    response.setHeader("Pragma", huc.getHeaderField("Pragma"));  
    response.setHeader("Expires", huc.getHeaderField("Expires"));  
    OutputStream os = response.getOutputStream();  

    // 将目标servlet的输入流直接往页面输出  
    InputStream targetIS = huc.getInputStream();  
    int r;  
    while ((r = targetIS.read()) != -1) {  
        os.write(r);  
    }  
    targetIS.close();  
    os.flush();
    os.close();  

    huc.disconnect();
    out.clear();
    out = pageContext.pushBody();
%>